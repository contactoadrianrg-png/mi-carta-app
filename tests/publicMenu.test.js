import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Bundle the actual JSX, replacing only the external Supabase connection.
// This exercises routing, effects, filtering and modal actions without emails
// or writes against the real application.
const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-'))
const output = join(temp, 'publicMenu.mjs')
await build({
  entryPoints: [join(root, 'src/pages/PublicMenuPage.jsx')], outfile: output,
  bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
  plugins: [{
    name: 'mock-supabase',
    setup(builder) {
      builder.onResolve({ filter: /\/lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'mock' }))
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: 'export const supabase = new Proxy({}, { get(_, key) { return globalThis.__messaClient[key] } });',
        loader: 'js',
      }))
    },
  }],
})
const { default: PublicMenuPage } = await import(pathToFileURL(output).href)
after(async () => { await rm(temp, { recursive: true, force: true }) })

const restaurant = { id: 'r', slug: 'demo', name: 'Restaurante de prueba', plan: 'pro', active: true }
const categories = [{ id: 'parent', name: 'Entrantes' }, { id: 'child', name: 'Fríos', parent_id: 'parent' }]
const dishes = [{ id: 'salad', name: 'Ensalada', category_id: 'child', price: 8, available: true }]

function setup(responses = {}) {
  const storage = new Map()
  const listeners = new Map()
  globalThis.window = { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } }
  globalThis.document = {
    body: { style: { overflow: '' } }, documentElement: { style: { setProperty() {} } },
    activeElement: { isConnected: true, focus() {} },
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event, callback) => { if (listeners.get(event) === callback) listeners.delete(event) },
  }
  const state = {
    restaurants: { data: restaurant, error: null },
    categories: { data: categories, error: null }, dishes: { data: dishes, error: null }, ...responses,
  }
  const inserts = []
  const channels = []
  const client = {
    from(table) {
      const filters = {}
      const response = () => typeof state[table] === 'function' ? state[table](filters) : state[table]
      return {
        select() { return this }, eq(key, value) { filters[key] = value; return this },
        maybeSingle: () => Promise.resolve(response()), order: () => Promise.resolve(response()),
        insert(value) { inserts.push({ table, value }); return Promise.resolve({ error: null }) },
      }
    },
    channel() {
      const handlers = []
      const channel = {
        handlers, removed: false,
        on(_event, _filter, handler) { handlers.push(handler); return this },
        subscribe() { return this },
      }
      channels.push(channel)
      return channel
    },
    removeChannel(channel) { channel.removed = true },
  }
  globalThis.__messaClient = client
  return { state, inserts, channels, storage, listeners }
}

function view(path = '/carta/demo/menu') {
  return React.createElement(MemoryRouter, {
    initialEntries: [path], future: { v7_startTransition: true, v7_relativeSplatPath: true },
  }, React.createElement(Routes, null,
    React.createElement(Route, { path: '/carta/:slug/menu', element: React.createElement(PublicMenuPage) }),
    React.createElement(Route, { path: '/carta/:slug/:catId', element: React.createElement(PublicMenuPage) }),
  ))
}

function text(tree) { return JSON.stringify(tree.toJSON()) }
function nodeText(node) {
  return typeof node === 'string' ? node : (node.children ?? []).map(nodeText).join('')
}
function button(tree, label) {
  return tree.root.findAllByType('button').find(node => nodeText(node).includes(label))
}

test('la categoría padre muestra platos hijos, los favoritos funcionan y Escape cierra la ficha', async () => {
  const data = setup()
  let tree
  try {
    await act(async () => { tree = create(view()) })
    assert.ok(button(tree, 'Entrantes'))
    await act(async () => { button(tree, 'Entrantes').props.onClick() })
    assert.match(text(tree), /Ensalada/)
    const card = tree.root.findAllByType('button').find(node => node.props.className?.includes('flex-col'))
    await act(async () => { card.props.onClick() })
    assert.equal(tree.root.findByProps({ role: 'dialog' }).props['aria-modal'], 'true')
    await act(async () => { button(tree, 'Añadir a favoritos').props.onClick() })
    assert.ok(button(tree, 'Quitar de favoritos'))
    assert.deepEqual(JSON.parse(data.storage.get('messa:favorites:demo')), ['salad'])
    assert.equal(document.body.style.overflow, 'hidden')
    await act(async () => { data.listeners.get('keydown')({ key: 'Escape', preventDefault() {} }) })
    assert.equal(tree.root.findAllByProps({ role: 'dialog' }).length, 0)
    assert.equal(document.body.style.overflow, '')
    assert.equal(data.inserts.filter(entry => entry.table === 'carta_views').length, 1)
    await act(async () => { data.channels[0].handlers[0]() })
    assert.equal(data.inserts.filter(entry => entry.table === 'carta_views').length, 1)
  } finally { if (tree) await act(async () => { tree.unmount() }) }
  assert.equal(data.channels[0].removed, true)
})

test('un fallo de carga muestra Reintentar y puede recuperarse', async () => {
  const data = setup({ categories: { data: null, error: new Error('offline') } })
  let tree
  try {
    await act(async () => { tree = create(view()) })
    assert.match(text(tree), /No se ha podido cargar la carta/)
    assert.doesNotMatch(text(tree), /Carta no encontrada/)
    data.state.categories = { data: categories, error: null }
    await act(async () => { button(tree, 'Reintentar').props.onClick() })
    assert.match(text(tree), /Ensalada/)
    assert.doesNotMatch(text(tree), /No se ha podido cargar la carta/)
  } finally { if (tree) await act(async () => { tree.unmount() }) }
})

test('los enlaces antiguos de categoría respetan subcategorías y restaurantes desactivados', async () => {
  setup()
  let tree
  try {
    await act(async () => { tree = create(view('/carta/demo/parent')) })
    assert.match(text(tree), /Ensalada/)
  } finally { if (tree) await act(async () => { tree.unmount() }) }
  const data = setup({ restaurants: { data: { ...restaurant, active: false }, error: null } })
  try {
    await act(async () => { tree = create(view('/carta/demo/parent')) })
    assert.match(text(tree), /Carta no disponible/)
    assert.doesNotMatch(text(tree), /Ensalada/)
    assert.equal(data.inserts.length, 0)
  } finally { if (tree) await act(async () => { tree.unmount() }) }
})

test('una carga que termina después de desmontar no abre suscripciones ni registra visitas', async () => {
  let resolve
  const pending = new Promise(done => { resolve = done })
  const data = setup({ restaurants: () => pending })
  let tree
  await act(async () => { tree = create(view()) })
  await act(async () => { tree.unmount() })
  await act(async () => { resolve({ data: restaurant, error: null }) })
  assert.equal(data.channels.length, 0)
  assert.equal(data.inserts.length, 0)
})
