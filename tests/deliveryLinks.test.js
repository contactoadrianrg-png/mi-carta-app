import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import { deliveryUrl, getDeliveryLinks } from '../src/lib/deliveryLinks.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-'))
await build({
  entryPoints: { welcome: join(root, 'src/components/menu/RestaurantWelcome.jsx'), editor: join(root, 'src/components/dashboard/DeliveryLinksEditor.jsx') },
  outdir: temp, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
  plugins: [{ name: 'mock-external-services', setup(builder) {
    builder.onResolve({ filter: /\/lib\/supabase$/ }, () => ({ path: 'supabase', namespace: 'mock' }))
    builder.onResolve({ filter: /^react-hot-toast$/ }, () => ({ path: 'toast', namespace: 'mock' }))
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ loader: 'js', contents: path === 'supabase' ? 'export const supabase = { from: (...args) => globalThis.__deliveryClient.from(...args) };' : 'export default { success: () => {}, error: value => globalThis.__deliveryErrors.push(value) };' }))
  } }],
})
const { default: Welcome } = await import(pathToFileURL(join(temp, 'welcome.mjs')).href)
const { default: Editor } = await import(pathToFileURL(join(temp, 'editor.mjs')).href)
after(() => rm(temp, { recursive: true, force: true }))

test('delivery URLs accept web links and reject executable, credentialed or incomplete URLs', () => {
  assert.equal(deliveryUrl(' https://glovoapp.com/es/madrid/local/ '), 'https://glovoapp.com/es/madrid/local/')
  for (const value of ['', undefined, {}, 'javascript:alert(1)', 'data:text/html,example', '//glovoapp.com', 'glovoapp.com', 'https://user:password@example.com']) assert.equal(deliveryUrl(value), null)
  assert.deepEqual(getDeliveryLinks({ delivery_glovo_url: 'https://glovoapp.com/local', delivery_uber_eats_url: 'javascript:alert(1)' }).map(link => link.label), ['Glovo'])
  assert.deepEqual(getDeliveryLinks({ delivery_custom_url: 'https://pedidos.local.es/' }).map(link => [link.label, link.href]), [['Pedir online', 'https://pedidos.local.es/']])
})

test('welcome shows the restaurant logo above text-only links, preserving menu and reservation destinations', () => {
  let view
  act(() => { view = create(React.createElement(MemoryRouter, {}, React.createElement(Welcome, { restaurant: { name: 'Local', slug: 'local', plan: 'pro', logo_url: '/logo-local.png', welcome_image_url: '/old-banner.jpg', reservation_url: 'https://example.com/reservas', delivery_glovo_url: 'https://glovoapp.com/local', delivery_uber_eats_url: 'https://ubereats.com/local', delivery_just_eat_url: 'https://just-eat.es/local' } }))) })
  const images = view.root.findAllByType('img')
  assert.equal(images.length, 1)
  assert.equal(images[0].props.src, '/logo-local.png')
  const links = view.root.findAllByType('a')
  assert.equal(links[0].props.href, '/carta/local/menu')
  assert.equal(links[1].props.href, 'https://example.com/reservas')
  assert.deepEqual(links.slice(2).map(link => link.children.join('')), ['Glovo', 'Uber Eats', 'Just Eat'])
  for (const link of links.slice(1)) assert.equal(link.props.rel, 'noopener noreferrer')
  act(() => images[0].props.onError())
  assert.equal(view.root.findAllByType('img').length, 0)
  act(() => view.unmount())
})

test('welcome hides unconfigured platforms and does not create a broken reservation link', () => {
  let view
  act(() => { view = create(React.createElement(MemoryRouter, {}, React.createElement(Welcome, { restaurant: { name: 'Local', slug: 'local', plan: 'pro', reservation_url: 'javascript:alert(1)' } }))) })
  assert.equal(view.root.findAllByType('a').length, 1)
  assert.equal(view.root.findAll(node => node.props.className === 'restaurant-entry-delivery').length, 0)
  assert.equal(view.root.findAll(node => node.props['aria-disabled'] === 'true').length, 1)
  act(() => view.unmount())
})

test('editor saves links on the current restaurant and clears removed links', async () => {
  const writes = []
  const updates = []
  globalThis.__deliveryErrors = []
  globalThis.__deliveryClient = { from(table) { return { update(value) { writes.push({ table, value }); return this }, eq(key, value) { writes.at(-1).filter = [key, value]; return this }, select() { return this }, single() { return Promise.resolve({ data: { id: 'local', ...writes.at(-1).value }, error: null }) } } } }
  let view
  act(() => { view = create(React.createElement(Editor, { restaurant: { id: 'local', delivery_glovo_url: 'https://glovoapp.com/old' }, onUpdate: data => updates.push(data) })) })
  act(() => view.root.findByProps({ id: 'delivery_glovo_url' }).props.onChange({ target: { value: '' } }))
  act(() => view.root.findByProps({ id: 'delivery_uber_eats_url' }).props.onChange({ target: { value: ' https://www.ubereats.com/local ' } }))
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.deepEqual(writes[0], { table: 'restaurants', value: { delivery_glovo_url: null, delivery_uber_eats_url: 'https://www.ubereats.com/local', delivery_just_eat_url: null, delivery_custom_url: null }, filter: ['id', 'local'] })
  assert.equal(updates.length, 1)
  act(() => view.root.findByProps({ id: 'delivery_glovo_url' }).props.onChange({ target: { value: 'javascript:alert(1)' } }))
  await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }))
  assert.equal(writes.length, 1)
  assert.equal(globalThis.__deliveryErrors.length, 1)
  act(() => view.unmount())
})
