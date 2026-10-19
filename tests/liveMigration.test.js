import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { restaurantProfileUpdates } from '../src/lib/restaurantProfile.js'

// Use synthetic identities when reproducing administrative email checks in memory.
const readFixtureSQL = async (path) => (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, 'admin@example.test')

test('la migración es compatible con el esquema real y conserva sus filas', async (t) => {
  const db = new PGlite()
  const admin = '11111111-1111-4111-8111-111111111111'
  const owner = '22222222-2222-4222-8222-222222222222'
  const other = '44444444-4444-4444-8444-444444444444'
  const restaurant = '33333333-3333-4333-8333-333333333333'
  const another = '55555555-5555-4555-8555-555555555555'
  const category = '66666666-6666-4666-8666-666666666666'
  const dish = '77777777-7777-4777-8777-777777777777'
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      grant usage on schema auth to anon, authenticated;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `)
    await db.exec(await readFixtureSQL('./fixtures/live-schema-20261018.sql'))
    await db.exec(await readFixtureSQL('./fixtures/updated-at-20261018.sql'))
    await db.query('insert into auth.users values ($1,$2),($3,$4),($5,$6)', [admin, 'admin@example.test', owner, 'owner@example.test', other, 'other@example.test'])
    await db.query("insert into public.restaurants (id,owner_id,name,slug,plan,theme) values ($1,$2,'Uno','uno','premium','jungle'),($3,$4,'Dos','dos','pro','default')", [restaurant, owner, another, other])
    await db.query("insert into public.categories (id,restaurant_id,name) values ($1,$2,'Entrantes')", [category, restaurant])
    await db.query("insert into public.dishes (id,restaurant_id,category_id,name,price) values ($1,$2,$3,'Ensalada',8.25)", [dish, restaurant, category])

    async function asRole(role, id, run) {
      await db.exec('begin')
      try {
        await db.exec(`set local role ${role}`)
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id ?? ''])
        await run()
      } finally { await db.exec('rollback') }
    }
    const snapshot = async () => (await db.query(`select jsonb_build_object(
      'restaurants',(select jsonb_agg(to_jsonb(r) - 'updated_at' - 'address' - 'daily_menu') from public.restaurants r),
      'categories',(select jsonb_agg(to_jsonb(c) - 'parent_id') from public.categories c),
      'dishes',(select jsonb_agg(to_jsonb(d) - 'allergens') from public.dishes d)) as data`)).rows[0].data
    const before = await snapshot()
    await t.test('reproduce el fallo de permisos anterior solo en memoria', async () => {
      await asRole('anon', null, async () => {
        await db.query('select public.admin_set_restaurant_active($1,false)', [restaurant])
      })
    })
    await db.exec(await readFixtureSQL('../supabase/migrations/20261018091900_repair_menu_and_admin_permissions.sql'))
    await db.exec(await readFixtureSQL('../supabase/migrations/20261018092206_repair_restaurant_contact_fields.sql'))

    await db.exec(await readFixtureSQL('../supabase/migrations/20261018110550_add_restaurant_menu_slides.sql'))
    await db.exec(await readFixtureSQL('../supabase/migrations/20261018120855_add_restaurant_dish_reordering.sql'))
    await db.exec(await readFixtureSQL('../supabase/migrations/20261018154744_add_restaurant_daily_menu.sql'))
    await db.exec(await readFixtureSQL('../supabase/migrations/20261019085129_add_admin_restaurant_workspace.sql'))

    await t.test('no cambia nombres, precios, planes, temas ni filas existentes', async () => {
      const after = await snapshot()
      // The new nullable logo field does not change existing values.
      for (const row of after.restaurants) { delete row.logo_url; delete row.menu_slides; delete row.admin_notes }
      assert.deepEqual(after, before)
    })
    await t.test('bloquea ahora las funciones administrativas para anónimos', async () => {
      for (const sql of [
        'select public.admin_set_restaurant_active($1,false)',
        "select public.admin_set_restaurant_plan($1,'free')",
        "select public.admin_set_restaurant_theme($1,'default')",
        "select public.admin_set_restaurant_notes($1,'Nota')",
      ]) await asRole('anon', null, async () => { await assert.rejects(db.query(sql, [restaurant]), /permission denied/) })
      await asRole('anon', null, async () => { await assert.rejects(db.query('select * from public.admin_get_all_restaurants()'), /permission denied/) })
    })
    await t.test('mantiene la firma y el acceso correcto del administrador', async () => {
      await asRole('authenticated', admin, async () => {
        const result = await db.query('select * from public.admin_get_all_restaurants()')
        assert.equal(result.rows.length, 2)
        assert.ok('theme' in result.rows[0])
        assert.equal(result.rows[0].dish_count, 1)
        assert.equal(result.rows[0].category_count, 1)
        assert.equal(result.rows[0].has_logo, false)
        assert.equal(result.rows[0].admin_notes, '')
        await db.query("select public.admin_set_restaurant_theme($1,'maibacht')", [restaurant])
        await db.query("select public.admin_set_restaurant_notes($1,'Pendiente de logo')", [restaurant])
        assert.equal((await db.query('select admin_notes from public.restaurants where id=$1', [restaurant])).rows[0].admin_notes, 'Pendiente de logo')
      })
    })
    await t.test('permite editar el nombre al propietario y le impide cambiar el plan', async () => {
      await asRole('authenticated', owner, async () => {
        const result = await db.query("update public.restaurants set name='Nombre nuevo' where id=$1 returning name", [restaurant])
        assert.equal(result.rows[0].name, 'Nombre nuevo')
      })
      await asRole('authenticated', owner, async () => {
        await assert.rejects(db.query("update public.restaurants set plan='free' where id=$1", [restaurant]), /permission denied/)
      })
    })
    await t.test('el carrusel guarda imágenes del propietario y respeta el aislamiento y el límite', async () => {
      const slides = JSON.stringify([{ id: 'promo', image_url: 'https://example.com/oferta.webp', title: 'Menú del día' }])
      await asRole('authenticated', owner, async () => {
        const result = await db.query('update public.restaurants set menu_slides=$1 where id=$2 returning menu_slides', [slides, restaurant])
        assert.equal(result.rows[0].menu_slides[0].title, 'Menú del día')
        const otherResult = await db.query('update public.restaurants set menu_slides=$1 where id=$2 returning id', [slides, another])
        assert.equal(otherResult.rows.length, 0)
      })
      await asRole('anon', null, async () => { await assert.rejects(db.query('update public.restaurants set menu_slides=$1 where id=$2', [slides, restaurant]), /permission denied/) })
      await asRole('authenticated', owner, async () => { await assert.rejects(db.query('update public.restaurants set menu_slides=$1 where id=$2', [JSON.stringify(Array(7).fill({ image_url: 'https://example.com/image.jpg' })), restaurant]), /constraint/) })
      await asRole('authenticated', owner, async () => { await assert.rejects(db.query('update public.restaurants set menu_slides=$1 where id=$2', ['{}', restaurant]), /constraint|cannot get array length/) })
    })
    await t.test('el menú del día es independiente, solo lo edita su propietario y valida sus platos y precio', async () => {
      const menu = { enabled: true, title: 'Menú del día', description: '', price: 12.5, image_url: '', firsts: ['Sopa del día'], seconds: ['Pollo guisado'], desserts: ['Flan'], includes: 'Bebida y pan', availability: 'Lunes a viernes' }
      const beforeDishes = (await db.query('select * from public.dishes order by id')).rows
      await asRole('authenticated', owner, async () => {
        const saved = await db.query('update public.restaurants set daily_menu=$1 where id=$2 returning daily_menu', [JSON.stringify(menu), restaurant])
        assert.deepEqual(saved.rows[0].daily_menu, menu)
        assert.equal((await db.query('update public.restaurants set daily_menu=$1 where id=$2 returning id', [JSON.stringify(menu), another])).rows.length, 0)
        assert.deepEqual((await db.query('select * from public.dishes order by id')).rows, beforeDishes)
      })
      await asRole('anon', null, async () => { await assert.rejects(db.query('update public.restaurants set daily_menu=$1 where id=$2', [JSON.stringify(menu), restaurant]), /permission denied/) })
      for (const invalid of [{ ...menu, price: -2 }, { ...menu, price: 12.555 }, { ...menu, price: null }, { ...menu, firsts: Array(11).fill('Sopa') }, { ...menu, firsts: [null] }, { ...menu, firsts: [''] }, { ...menu, firsts: [], seconds: [] }, { ...menu, image_url: 'javascript:alert(1)' }, { ...menu, enabled: 'true' }]) {
        await asRole('authenticated', owner, async () => { await assert.rejects(db.query('update public.restaurants set daily_menu=$1 where id=$2', [JSON.stringify(invalid), restaurant]), /constraint/) })
      }
      await asRole('authenticated', owner, async () => {
        const hidden = { ...menu, enabled: false, price: null, firsts: [], seconds: [], desserts: [] }
        await db.query('update public.restaurants set daily_menu=$1 where id=$2', [JSON.stringify(hidden), restaurant])
      })
    })
    await t.test('reordena la lista completa sin alterar precios ni disponibilidad y rechaza listas inválidas', async () => {
      await asRole('authenticated', owner, async () => {
        const extra = (await db.query("insert into public.dishes (restaurant_id,name,price,available,sort_order) values ($1,'Sopa',5,true,2),($1,'Oculto',9,false,4) returning id", [restaurant])).rows
        const ids = [extra[1].id, dish, extra[0].id]
        const before = (await db.query('select id,name,price,available from public.dishes where restaurant_id=$1 order by id', [restaurant])).rows
        await db.query('select public.reorder_restaurant_dishes($1,$2::uuid[])', [restaurant, ids])
        const ordered = (await db.query('select id,sort_order from public.dishes where restaurant_id=$1 order by sort_order', [restaurant])).rows
        assert.deepEqual(ordered.map(row => row.id), ids)
        assert.deepEqual(ordered.map(row => row.sort_order), [0, 1, 2])
        assert.deepEqual((await db.query('select id,name,price,available from public.dishes where restaurant_id=$1 order by id', [restaurant])).rows, before)
        for (const invalid of [[dish,dish,extra[0].id], [dish], [dish,null,extra[0].id], [dish,'88888888-8888-4888-8888-888888888888',extra[0].id]]) {
          await db.exec('savepoint invalid_order')
          await assert.rejects(db.query('select public.reorder_restaurant_dishes($1,$2::uuid[])', [restaurant, invalid]), /repetidos|ha cambiado|no es válido/)
          await db.exec('rollback to savepoint invalid_order')
          assert.deepEqual((await db.query('select id,sort_order from public.dishes where restaurant_id=$1 order by sort_order', [restaurant])).rows, ordered)
        }
      })
    })
    await t.test('reordenar solo está permitido al propietario autenticado', async () => {
      await asRole('anon', null, async () => { await assert.rejects(db.query('select public.reorder_restaurant_dishes($1,$2::uuid[])', [restaurant,[dish]]), /permission denied/) })
      await asRole('authenticated', other, async () => { await assert.rejects(db.query('select public.reorder_restaurant_dishes($1,$2::uuid[])', [restaurant,[dish]]), /No tienes permiso/) })
      await asRole('authenticated', null, async () => { await assert.rejects(db.query('select public.reorder_restaurant_dishes($1,$2::uuid[])', [restaurant,[dish]]), /No tienes permiso/) })
    })
    await t.test('acepta estadísticas válidas y solo el propietario puede leerlas', async () => {
      await db.exec('begin')
      try {
        await db.exec('set local role anon')
        await db.query('insert into public.carta_views (restaurant_id) values ($1)', [restaurant])
        await db.query("insert into public.plate_views (restaurant_id,plate_id,plate_name) values ($1,$2,'Ensalada')", [restaurant, dish])
        await db.exec('set local role authenticated')
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [owner])
        assert.equal((await db.query('select * from public.carta_views')).rows.length, 1)
        assert.equal((await db.query('select * from public.plate_views')).rows.length, 1)
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other])
        assert.equal((await db.query('select * from public.carta_views')).rows.length, 0)
      } finally { await db.exec('rollback') }
    })
    await t.test('rechaza platos falsificados y fechas de estadísticas manipuladas', async () => {
      await asRole('anon', null, async () => {
        await assert.rejects(db.query("insert into public.plate_views (restaurant_id,plate_id,plate_name) values ($1,$2,'Nombre falso')", [restaurant, dish]), /row-level security/)
      })
      await asRole('anon', null, async () => {
        await assert.rejects(db.query("insert into public.carta_views (restaurant_id,viewed_at) values ($1,'2000-01-01')", [restaurant]), /permission denied/)
      })
    })
    await t.test('las subcategorías no pueden depender de otro restaurante', async () => {
      await asRole('authenticated', other, async () => {
        await assert.rejects(db.query("insert into public.categories (restaurant_id,name,parent_id) values ($1,'Inválida',$2)", [another, category]), /foreign key constraint/)
      })
      await asRole('authenticated', owner, async () => {
        await db.query("insert into public.categories (restaurant_id,name,parent_id) values ($1,'Válida',$2)", [restaurant, category])
      })
    })
    await t.test('el editor guarda el teléfono público y la dirección usando columnas reales', async () => {
      await asRole('authenticated', owner, async () => {
        const payload = restaurantProfileUpdates({ name: ' Uno ', description: ' Descripción ', phone: ' +34 600 000 000 ', address: ' Calle de prueba 1 ' })
        const entries = Object.entries(payload)
        const assignments = entries.map(([column], index) => `${column}=$${index + 1}`).join(',')
        const result = await db.query(`update public.restaurants set ${assignments} where id=$${entries.length + 1} returning social_phone,address`, [...entries.map(([, value]) => value), restaurant])
        assert.equal(result.rows[0].social_phone, '+34 600 000 000')
        assert.equal(result.rows[0].address, 'Calle de prueba 1')
        const cleared = restaurantProfileUpdates({ name: 'Uno', description: '', phone: ' ', address: '' })
        await db.query('update public.restaurants set social_phone=$1,address=$2 where id=$3', [cleared.social_phone, cleared.address, restaurant])
        const { rows } = await db.query('select social_phone,address from public.restaurants where id=$1', [restaurant])
        assert.equal(rows[0].social_phone, null)
        assert.equal(rows[0].address, null)
      })
    })
  } finally { await db.close() }
})
