import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-slides-'))
const output = join(temp, 'editor.mjs')
await build({ entryPoints: [join(root, 'src/components/dashboard/MenuSlidesEditor.jsx')], outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', plugins: [{ name: 'mock-boundaries', setup(builder) {
  builder.onResolve({ filter: /\/lib\/supabase$/ }, () => ({ path: 'client', namespace: 'mock' }))
  builder.onResolve({ filter: /^react-hot-toast$/ }, () => ({ path: 'toast', namespace: 'mock' }))
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'toast' ? 'export default { success() {}, error() {} }' : 'export const supabase = new Proxy({}, { get(_, key) { return globalThis.__slidesClient[key] } });', loader: 'js' }))
} }] })
const { default: Editor } = await import(pathToFileURL(output).href)
after(async () => { await rm(temp, { recursive: true, force: true }) })

test('sube y ordena imágenes; reintentar un fallo al guardar no vuelve a subir los archivos', async () => {
  const uploads = [], updates = []
  let fail = true, saved
  globalThis.__slidesClient = {
    storage: { from: () => ({ upload: async (path, file) => { uploads.push({ path, file }); return { error: null } }, getPublicUrl: path => ({ data: { publicUrl: `https://example.com/${path}` } }) }) },
    from: () => ({ update(value) { updates.push(value); return this }, eq() { return this }, select() { return this }, single: async () => fail ? { error: new Error('offline') } : { data: { id: 'restaurant', menu_slides: updates.at(-1).menu_slides }, error: null } }),
  }
  let tree
  try {
    await act(async () => { tree = create(React.createElement(Editor, { restaurant: { id: 'restaurant', menu_slides: [] }, userId: 'owner', onUpdate: value => { saved = value } })) })
    const input = tree.root.findByProps({ type: 'file' })
    await act(async () => { input.props.onChange({ target: { files: [new File(['one'], 'oferta.jpg', { type: 'image/jpeg' }), new File(['two'], 'menu.png', { type: 'image/png' })], value: '' } }) })
    const descriptions = tree.root.findAllByProps({ maxLength: 160 })
    await act(async () => { descriptions[0].props.onChange({ target: { value: 'Primera oferta' } }) })
    await act(async () => { tree.root.findByProps({ 'aria-label': 'Bajar imagen 1' }).props.onClick() })
    const save = () => tree.root.findAllByType('button').find(node => node.children.includes('Guardar carrusel'))
    await act(async () => { await save().props.onClick() })
    assert.equal(uploads.length, 2)
    assert.ok(uploads.every(upload => upload.path.startsWith('owner/slides/')))
    assert.equal(saved, undefined)
    fail = false
    await act(async () => { await save().props.onClick() })
    assert.equal(uploads.length, 2)
    assert.equal(saved.menu_slides[1].title, 'Primera oferta')
    assert.equal(saved.menu_slides.length, 2)
  } finally { if (tree) await act(async () => tree.unmount()) }
})
