import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Supabase supplies these schemas, roles and JWT helpers in production.
// This minimal fixture runs only in a new, in-memory PostgreSQL database.
const bootstrap = `
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create function auth.role() returns text language sql stable as $$
    select current_user::text;
  $$;
  grant usage on schema auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (bucket_id text, name text);
  create publication supabase_realtime;
`

test('el esquema se instala y las funciones de administración rechazan accesos indebidos', async (t) => {
  const db = new PGlite()
  try {
    await db.exec(bootstrap)
    await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
    const admin = '11111111-1111-4111-8111-111111111111'
    const owner = '22222222-2222-4222-8222-222222222222'
    const restaurant = '33333333-3333-4333-8333-333333333333'
    await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
      admin, 'infocreativeadrian@gmail.com', owner, 'owner@example.com',
    ])
    await db.query('insert into public.restaurants (id, owner_id, name, slug) values ($1, $2, $3, $4)', [
      restaurant, owner, 'Restaurante de prueba', 'prueba',
    ])

    async function withRole(role, userId, run) {
      await db.exec('begin')
      try {
        await db.exec(`set local role ${role}`)
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ''])
        await run()
      } finally {
        await db.exec('rollback')
      }
    }

    const calls = [
      ['select * from public.admin_get_all_restaurants()', []],
      ['select public.admin_set_restaurant_active($1, false)', [restaurant]],
      ["select public.admin_set_restaurant_plan($1, 'pro')", [restaurant]],
      ["select public.admin_set_restaurant_theme($1, 'jungle')", [restaurant]],
      ["select public.admin_set_restaurant_notes($1, 'Cliente interesado')", [restaurant]],
    ]
    for (const [label, role, id, message] of [
      ['anónimo', 'anon', null, /permission denied/],
      ['sin identidad JWT', 'authenticated', null, /Unauthorized/],
      ['propietario sin rol de administrador', 'authenticated', owner, /Unauthorized/],
    ]) {
      await t.test(`bloquea las cinco funciones para ${label}`, async () => {
        for (const [sql, args] of calls) {
          await withRole(role, id, async () => {
            await assert.rejects(db.query(sql, args), message)
          })
        }
      })
    }

    await t.test('permite al administrador consultar, activar y cambiar plan, tema y notas', async () => {
      await withRole('authenticated', admin, async () => {
        const { rows } = await db.query('select * from public.admin_get_all_restaurants()')
        assert.equal(rows.length, 1)
        assert.equal(rows[0].theme, 'default')
        assert.equal(rows[0].dish_count, 0)
        assert.equal(rows[0].admin_notes, '')
        for (const [sql, args] of calls.slice(1)) await db.query(sql, args)
        const { rows: updated } = await db.query('select * from public.admin_get_all_restaurants()')
        assert.equal(updated[0].active, false)
        assert.equal(updated[0].plan, 'pro')
        assert.equal(updated[0].theme, 'jungle')
        assert.equal(updated[0].admin_notes, 'Cliente interesado')
      })
    })

    await t.test('rechaza planes y temas nulos o desconocidos', async () => {
      for (const [functionName, message] of [
        ['admin_set_restaurant_plan', /Plan inválido/],
        ['admin_set_restaurant_theme', /Tema inválido/],
      ]) {
        for (const value of [null, 'premium', 'desconocido']) {
          await withRole('authenticated', admin, async () => {
            await assert.rejects(db.query(`select public.${functionName}($1, $2)`, [restaurant, value]), message)
          })
        }
      }
      await withRole('authenticated', admin, async () => {
        await assert.rejects(db.query("select public.admin_set_restaurant_notes($1, repeat('x', 2001))", [restaurant]), /notas/)
      })
    })

    await t.test('el propietario puede editar su restaurante y crear otro con plan Free', async () => {
      await withRole('authenticated', owner, async () => {
        const result = await db.query('update public.restaurants set name = $1 where id = $2 returning name', [
          'Nombre actualizado', restaurant,
        ])
        assert.equal(result.rows[0].name, 'Nombre actualizado')
        const inserted = await db.query('insert into public.restaurants (owner_id, name, slug) values ($1, $2, $3) returning plan', [
          owner, 'Otro restaurante', 'otro-restaurante',
        ])
        assert.equal(inserted.rows[0].plan, 'free')
      })
    })

    await t.test('el propietario no puede cambiar plan, estado, tema admin ni titular por API', async () => {
      for (const [column, value] of [
        ['plan', 'pro'], ['active', false], ['theme', 'jungle'], ['owner_id', admin],
      ]) {
        await withRole('authenticated', owner, async () => {
          await assert.rejects(db.query(`update public.restaurants set ${column} = $1 where id = $2`, [value, restaurant]), /permission denied/)
        })
      }
      await withRole('authenticated', owner, async () => {
        await assert.rejects(db.query("insert into public.restaurants (owner_id, name, slug, plan) values ($1, 'No permitido', 'no-permitido', 'pro')", [owner]), /permission denied/)
      })
    })

    await t.test('el propietario no puede modificar el restaurante de otro usuario', async () => {
      await db.query('insert into public.restaurants (owner_id, name, slug) values ($1, $2, $3)', [
        admin, 'Restaurante ajeno', 'restaurante-ajeno',
      ])
      await withRole('authenticated', owner, async () => {
        const { rows } = await db.query("update public.restaurants set name = 'Cambio no permitido' where slug = 'restaurante-ajeno' returning id")
        assert.equal(rows.length, 0)
      })
    })
  } finally {
    await db.close()
  }
})
