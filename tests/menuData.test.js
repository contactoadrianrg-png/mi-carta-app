import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryFamilyIds, filterMenuDishes, visibleMenuCategories, loadPublicMenu } from '../src/lib/menuData.js'
import { readMenuFavorites, saveMenuFavorites } from '../src/lib/menuFavorites.js'

const categories = [
  { id: 'food', name: 'Comida', parent_id: null },
  { id: 'starters', name: 'Entrantes', parent_id: 'food' },
  { id: 'cold', name: 'Fríos', parent_id: 'starters' },
  { id: 'drinks', name: 'Bebidas', parent_id: null },
  { id: 'empty', name: 'Vacía', parent_id: null },
]
const dishes = [{ id: 'salad', category_id: 'cold' }, { id: 'water', category_id: 'drinks' }]

test('una categoría con platos solo en subcategorías sigue visible', () => {
  assert.deepEqual(visibleMenuCategories(categories, dishes).map(c => c.id), ['food', 'drinks'])
})

test('el filtro incluye descendientes y mantiene separados los platos ajenos', () => {
  assert.deepEqual(filterMenuDishes(dishes, categories, 'food').map(d => d.id), ['salad'])
  assert.deepEqual(filterMenuDishes(dishes, categories, 'drinks').map(d => d.id), ['water'])
  assert.deepEqual(filterMenuDishes(dishes, categories, null), dishes)
})

test('datos de categorías cíclicos no bloquean la carta', () => {
  const cyclic = [{ id: 'a', parent_id: 'b' }, { id: 'b', parent_id: 'a' }]
  assert.deepEqual([...categoryFamilyIds(cyclic, 'a')].sort(), ['a', 'b'])
})

function clientWith(responses) {
  const calls = []
  return {
    calls,
    from(table) {
      calls.push(table)
      return {
        select() { return this }, eq() { return this },
        maybeSingle() { return Promise.resolve(responses[table]) },
        order() { return Promise.resolve(responses[table]) },
      }
    },
  }
}

test('distingue un restaurante inexistente de un fallo de conexión', async () => {
  const missing = clientWith({ restaurants: { data: null, error: null } })
  assert.equal((await loadPublicMenu(missing, 'missing')).restaurant, null)
  const failure = new Error('Network failure')
  const offline = clientWith({ restaurants: { data: null, error: failure } })
  await assert.rejects(loadPublicMenu(offline, 'restaurant'), failure)
})

test('un restaurante desactivado no carga platos ni categorías', async () => {
  const client = clientWith({ restaurants: { data: { id: 'r', active: false }, error: null } })
  const result = await loadPublicMenu(client, 'restaurant')
  assert.equal(result.restaurant.active, false)
  assert.deepEqual(client.calls, ['restaurants'])
})

test('los errores de platos o categorías no se convierten en una carta vacía', async () => {
  for (const table of ['categories', 'dishes']) {
    const failure = new Error(`${table} unavailable`)
    const client = clientWith({
      restaurants: { data: { id: 'r', active: true }, error: null },
      categories: { data: [], error: null }, dishes: { data: [], error: null },
      [table]: { data: null, error: failure },
    })
    await assert.rejects(loadPublicMenu(client, 'restaurant'), failure)
  }
})

test('los favoritos se guardan separados por restaurante', () => {
  const data = new Map()
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }
  assert.equal(saveMenuFavorites('uno', ['salad'], storage), true)
  assert.deepEqual(readMenuFavorites('uno', storage), ['salad'])
  assert.deepEqual(readMenuFavorites('otro', storage), [])
})

test('favoritos dañados o almacenamiento bloqueado no rompen la carta', () => {
  assert.deepEqual(readMenuFavorites('r', { getItem() { return '{bad json' } }), [])
  assert.deepEqual(readMenuFavorites('r', { getItem() { return '["salad","salad",null,4]' } }), ['salad'])
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.deepEqual(readMenuFavorites('r', blocked), [])
  assert.equal(saveMenuFavorites('r', ['salad'], blocked), false)
})
