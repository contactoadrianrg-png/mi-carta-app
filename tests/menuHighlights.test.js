import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'

const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-highlights-'))
const output = join(temp, 'highlights.mjs')
await build({ entryPoints: [join(root, 'src/components/menu/MenuHighlights.jsx')], outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic' })
const { default: Highlights } = await import(pathToFileURL(output).href)
after(async () => { await rm(temp, { recursive: true, force: true }) })
const slides = [{ id: 'first', image_url: 'https://example.test/first.jpg', title: 'Primera oferta' }, { id: 'last', image_url: 'https://example.test/last.jpg', title: 'Última oferta' }]

function setup(reduced = false) {
  const timers = new Map(), events = new Map(), motionEvents = new Map()
  let nextId = 1
  const originalTimeout = globalThis.setTimeout, originalClear = globalThis.clearTimeout
  const originalWindow = globalThis.window, originalDocument = globalThis.document
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay !== 5000) return originalTimeout(callback, delay, ...args)
    const id = { carouselTimer: nextId++ }; timers.set(id, callback); return id
  }
  globalThis.clearTimeout = id => { if (timers.has(id)) timers.delete(id); else originalClear(id) }
  const media = { matches: reduced, addEventListener: (name, callback) => motionEvents.set(name, callback), removeEventListener: name => motionEvents.delete(name) }
  globalThis.window = { matchMedia: () => media }
  globalThis.document = { hidden: false, addEventListener: (name, callback) => events.set(name, callback), removeEventListener: name => events.delete(name) }
  return { timers, media, events, motionEvents, tick() { const item = timers.entries().next().value; assert.ok(item, 'hay un avance pendiente'); timers.delete(item[0]); item[1]() }, restore() { globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClear; globalThis.window = originalWindow; globalThis.document = originalDocument } }
}
function active(tree) { return tree.root.findAllByType('li').find(node => node.props['aria-hidden'] === false).findByType('img').props.alt }
function control(tree, label) { return tree.root.findAllByType('button').find(node => node.props['aria-label'] === label) }

test('avanza cada cinco segundos, vuelve a la primera oferta y pausa al interactuar o al ocultarse', async () => {
  const env = setup(); let tree
  try {
    await act(async () => { tree = create(React.createElement(Highlights, { slides })) })
    assert.equal(active(tree), 'Primera oferta'); assert.equal(env.timers.size, 1)
    await act(async () => env.tick()); assert.equal(active(tree), 'Última oferta')
    await act(async () => env.tick()); assert.equal(active(tree), 'Primera oferta')
    await act(async () => tree.root.findByType('section').props.onPointerEnter({ pointerType: 'mouse' }))
    assert.equal(env.timers.size, 0)
    await act(async () => tree.root.findByType('section').props.onPointerLeave()); assert.equal(env.timers.size, 1)
    await act(async () => control(tree, 'Pausar presentación').props.onClick()); assert.equal(env.timers.size, 0)
    await act(async () => control(tree, 'Reanudar presentación').props.onClick()); assert.equal(env.timers.size, 1)
    await act(async () => tree.root.findByType('section').props.onFocusCapture()); assert.equal(env.timers.size, 0)
    await act(async () => tree.root.findByType('section').props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null })); assert.equal(env.timers.size, 1)
    await act(async () => { document.hidden = true; env.events.get('visibilitychange')() }); assert.equal(env.timers.size, 0)
    await act(async () => { document.hidden = false; env.events.get('visibilitychange')() }); assert.equal(env.timers.size, 1)
    await act(async () => { env.media.matches = true; env.motionEvents.get('change')() }); assert.equal(env.timers.size, 0)
  } finally { if (tree) await act(async () => tree.unmount()); assert.equal(env.timers.size, 0); assert.equal(env.events.size, 0); assert.equal(env.motionEvents.size, 0); env.restore() }
})

test('las flechas y el gesto táctil recorren ambos extremos sin bloquear el desplazamiento vertical', async () => {
  const env = setup(); let tree
  try {
    await act(async () => { tree = create(React.createElement(Highlights, { slides })) })
    await act(async () => control(tree, 'Ver imágenes anteriores').props.onClick()); assert.equal(active(tree), 'Última oferta')
    await act(async () => control(tree, 'Ver más imágenes').props.onClick()); assert.equal(active(tree), 'Primera oferta')
    await act(async () => tree.root.findByType('ul').props.onPointerDown({ pointerType: 'touch', pointerId: 1, clientX: 220, clientY: 20, currentTarget: {} }))
    assert.equal(env.timers.size, 0)
    await act(async () => tree.root.findByType('ul').props.onPointerUp({ pointerId: 1, clientX: 50, clientY: 30 })); assert.equal(active(tree), 'Última oferta')
    await act(async () => tree.root.findByType('ul').props.onPointerDown({ pointerType: 'touch', pointerId: 2, clientX: 50, clientY: 20, currentTarget: {} }))
    await act(async () => tree.root.findByType('ul').props.onPointerUp({ pointerId: 2, clientX: 100, clientY: 220 })); assert.equal(active(tree), 'Última oferta')
  } finally { if (tree) await act(async () => tree.unmount()); env.restore() }
})

test('respeta movimiento reducido y no crea avance automático para una imagen o una lista vacía', async () => {
  const env = setup(true); let tree
  try {
    await act(async () => { tree = create(React.createElement(Highlights, { slides })) })
    assert.equal(env.timers.size, 0)
    assert.equal(control(tree, 'Pausar presentación'), undefined)
    await act(async () => control(tree, 'Ver más imágenes').props.onClick()); assert.equal(active(tree), 'Última oferta')
    await act(async () => tree.update(React.createElement(Highlights, { slides: slides.slice(0, 1) })))
    assert.equal(active(tree), 'Primera oferta'); assert.equal(env.timers.size, 0); assert.equal(tree.root.findAllByType('button').length, 0)
    await act(async () => tree.update(React.createElement(Highlights, { slides: [] })))
    assert.equal(tree.toJSON(), null); assert.equal(env.timers.size, 0)
  } finally { if (tree) await act(async () => tree.unmount()); env.restore() }
})
