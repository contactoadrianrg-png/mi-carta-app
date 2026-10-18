import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-dashboard-'))
const output = join(temp, 'dashboard.mjs')
await build({ entryPoints: [join(root, 'src/pages/DashboardPage.jsx')], outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', plugins: [{ name: 'dashboard-boundaries', setup(builder) {
  builder.onResolve({ filter: /\/lib\/supabase$/ }, () => ({ path: 'client', namespace: 'mock' }))
  builder.onResolve({ filter: /\/context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'mock' }))
  builder.onResolve({ filter: /^react-hot-toast$/ }, () => ({ path: 'toast', namespace: 'mock' }))
  builder.onResolve({ filter: /\/(RestaurantEditor|DishManager|CategoryManager|AccountPanel|SocialsPanel|StatsPanel)$/ }, args => ({ path: args.path.split('/').pop(), namespace: 'widget' }))
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'client' ? 'export const supabase = new Proxy({}, {get(_, key) {return globalThis.__dashboardClient[key]}})' : path === 'auth' ? 'export function useAuth() {return {user:globalThis.__dashboardUser}}' : 'export default {success(){},error(){}}', loader: 'js' }))
  builder.onLoad({ filter: /.*/, namespace: 'widget' }, ({ path }) => ({ contents: `import React from 'react';export default function Widget(){return React.createElement('div',{'data-widget':'${path}'},'${path}')}`, resolveDir: root, loader: 'js' }))
} }] })
const { default: Dashboard } = await import(pathToFileURL(output).href)
after(async () => { await rm(temp, { recursive: true, force: true }) })
function setup(plan = 'premium', restaurantExists = true) {
  const restaurant = { id: 'rest', name: 'Mi restaurante', slug: 'demo', active: true, plan, menu_slides: [], reservation_url: '' }
  const counts = [], updates = []
  globalThis.__dashboardUser = { id: 'owner' }
  globalThis.window = { location: { origin: 'https://messa.example' } }
  globalThis.__dashboardClient = { from(table) {
    const filters = {}; let head = false, update
    const query = { select(_fields, options) { head = !!options?.head; return this }, eq(key, value) { filters[key] = value; return this }, update(value) { update = value; updates.push(value); return this }, single() { return Promise.resolve({ data: { ...restaurant, ...update }, error: null }) }, maybeSingle() { return Promise.resolve({ data: restaurantExists ? restaurant : null, error: null }) }, then(resolve) { if(head) counts.push({ table, filters });return Promise.resolve({ count: table === 'dishes' ? 7 : 4, error: null }).then(resolve) } }
    return query
  } }
  return { counts, updates }
}
function text(node) { return typeof node === 'string' ? node : (node.children ?? []).map(text).join('') }
function button(tree, label) { return tree.root.findAllByType('button').find(node => text(node).includes(label)) }

test('los accesos abren platos, categorías, carrusel, identidad, reservas y QR', async () => {
  const { counts, updates } = setup()
  let tree
  try {
    await act(async () => { tree = create(React.createElement(Dashboard)) })
    assert.ok(counts.find(count => count.table === 'dishes' && count.filters.available === true))
    await act(async () => button(tree, 'Platos y categorías').props.onClick())
    assert.equal(tree.root.findByProps({ 'data-widget': 'DishManager' }).type, 'div')
    await act(async () => button(tree, 'Categorías').props.onClick())
    assert.equal(tree.root.findByProps({ 'data-widget': 'CategoryManager' }).type, 'div')
    await act(async () => button(tree, 'Inicio').props.onClick())
    await act(async () => button(tree, 'Carrusel de ofertas').props.onClick())
    assert.equal(tree.root.findByProps({ 'aria-label': 'Añadir imágenes al carrusel' }).type, 'input')
    await act(async () => button(tree, 'Inicio').props.onClick())
    await act(async () => button(tree, 'Nombre y logo').props.onClick())
    assert.equal(tree.root.findByProps({ role: 'dialog' }).props['aria-label'], 'Personalizar mi restaurante')
    await act(async () => tree.root.findByProps({ 'aria-label': 'Cerrar personalización' }).props.onClick())
    await act(async () => button(tree, 'Mi QR').props.onClick())
    assert.equal(tree.root.findByProps({ role: 'dialog' }).props['aria-label'], 'Mi QR')
    await act(async () => tree.root.findByProps({ 'aria-label': 'Cerrar QR' }).props.onClick())
    await act(async () => button(tree, 'Reservas y redes').props.onClick())
    assert.equal(tree.root.findByProps({ 'data-widget': 'SocialsPanel' }).type, 'div')
    await act(async () => tree.root.findByProps({ id: 'md-reservation-url' }).props.onChange({ target: { value: 'https://wa.me/34000000000' } }))
    await act(async () => { await tree.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    assert.deepEqual(updates.at(-1), { reservation_url: 'https://wa.me/34000000000' })
  } finally { if (tree) await act(async () => tree.unmount()) }
})

test('un restaurante Free mantiene el bloqueo Pro y una cuenta nueva llega a configuración', async () => {
  setup('free'); let tree
  try {
    await act(async () => { tree = create(React.createElement(Dashboard)) })
    await act(async () => button(tree, 'Carrusel de ofertas').props.onClick())
    assert.match(JSON.stringify(tree.toJSON()), /Disponible en el Plan Pro/)
    assert.equal(tree.root.findAllByProps({ type: 'file' }).length, 0)
  } finally { if (tree) await act(async () => tree.unmount()) }
  setup('free', false)
  try {
    await act(async () => { tree = create(React.createElement(Dashboard)) })
    await act(async () => button(tree, 'Crear mi restaurante').props.onClick())
    assert.equal(tree.root.findByProps({ 'data-widget': 'RestaurantEditor' }).type, 'div')
  } finally { if (tree) await act(async () => tree.unmount()) }
})
