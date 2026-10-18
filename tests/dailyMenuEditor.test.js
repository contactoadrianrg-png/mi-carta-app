import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-daily-'))
const output = join(temp, 'daily.mjs')
await build({ entryPoints: [join(root, 'src/components/dashboard/DailyMenuEditor.jsx')], outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', plugins: [{ name: 'daily-boundaries', setup(builder) {
  builder.onResolve({ filter: /\/lib\/supabase$/ }, () => ({ path: 'client', namespace: 'mock' }))
  builder.onResolve({ filter: /^react-hot-toast$/ }, () => ({ path: 'toast', namespace: 'mock' }))
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path === 'client' ? 'export const supabase = new Proxy({}, {get(_, key) {return globalThis.__dailyClient[key]}})' : 'export default {success(){},error(){}}', loader: 'js' }))
} }] })
const { default: Editor } = await import(pathToFileURL(output).href)
after(async () => { await rm(temp, { recursive: true, force: true }) })

test('guarda únicamente el menú del restaurante y reintentar un error no vuelve a subir la foto', async () => {
  const uploads = [], updates = []
  let fail = true, saved, tree
  globalThis.__dailyClient = {
    storage: { from(bucket) { assert.equal(bucket, 'dish-images'); return { upload: async (path, file) => { uploads.push({ path, file }); return { error: null } }, getPublicUrl: path => ({ data: { publicUrl: `https://example.test/${path}` } }) } } },
    from(table) { assert.equal(table, 'restaurants'); return { update(value) { updates.push(value); return this }, eq(key, value) { assert.equal(key, 'id'); assert.equal(value, 'restaurant'); return this }, select() { return this }, single: async () => fail ? { error: new Error('offline') } : { data: { id: 'restaurant', daily_menu: updates.at(-1).daily_menu }, error: null } } },
  }
  try {
    await act(async () => { tree = create(React.createElement(Editor, { restaurant: { id: 'restaurant' }, userId: 'owner', onUpdate: value => { saved = value } })) })
    await act(async () => {
      tree.root.findByProps({ type: 'number' }).props.onChange({ target: { value: '12.5' } })
      tree.root.findByProps({ 'aria-label': 'Primeros del menú' }).props.onChange({ target: { value: 'Sopa\nEnsalada' } })
      tree.root.findByProps({ 'aria-label': 'Segundos del menú' }).props.onChange({ target: { value: 'Pollo' } })
      tree.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: true } })
      tree.root.findByProps({ type: 'file' }).props.onChange({ target: { files: [new File(['image'], 'menu.jpg', { type: 'image/jpeg' })], value: '' } })
    })
    await act(async () => { await tree.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    assert.equal(saved, undefined); assert.equal(uploads.length, 1)
    assert.ok(uploads[0].path.startsWith('owner/daily-menu/'))
    assert.equal(tree.root.findByProps({ role: 'alert' }).children.join(''), 'offline')
    fail = false
    await act(async () => { await tree.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    assert.equal(uploads.length, 1)
    assert.deepEqual(Object.keys(updates.at(-1)), ['daily_menu'])
    assert.deepEqual(saved.daily_menu.firsts, ['Sopa', 'Ensalada'])
    assert.equal(saved.daily_menu.price, 12.5)
    await act(async () => tree.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: false } }))
    await act(async () => { await tree.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    assert.equal(saved.daily_menu.enabled, false)
    assert.deepEqual(saved.daily_menu.firsts, ['Sopa', 'Ensalada'])
  } finally { if (tree) await act(async () => tree.unmount()) }
})
