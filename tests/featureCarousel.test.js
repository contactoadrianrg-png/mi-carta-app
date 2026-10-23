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
await build({ entryPoints: [join(root, 'src/components/auth/FeatureCarousel.jsx')], outfile: output, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic' })
const { default: Carousel } = await import(pathToFileURL(output).href)
after(async () => { await rm(temp, { recursive: true, force: true }) })
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
function active(tree) { return tree.root.findAllByType('figure').find(node => node.props['aria-hidden'] === false).findByType('h2').children.join('') }
function control(tree, label) { return tree.root.findAllByType('button').find(node => node.props['aria-label'] === label) }

test('feature carousel advances, pauses for manual selection, visibility and reduced motion, and cleans up', async () => {
 const env=setup(); let tree
 try {
  await act(async()=>{tree=create(React.createElement(Carousel))})
  assert.equal(active(tree),'Tu carta entra por los ojos')
  await act(async()=>env.tick())
  assert.equal(active(tree),'Tus promociones, a la vista')
  await act(async()=>control(tree,'Ver: Actualiza desde tu móvil').props.onClick())
  assert.equal(active(tree),'Actualiza desde tu móvil'); assert.equal(env.timers.size,0)
  await act(async()=>control(tree,'Reanudar animación').props.onClick())
  assert.equal(env.timers.size,1)
  await act(async()=>{document.hidden=true;env.events.get('visibilitychange')()})
  assert.equal(env.timers.size,0)
  await act(async()=>{document.hidden=false;env.events.get('visibilitychange')()})
  assert.equal(env.timers.size,1)
  await act(async()=>{env.media.matches=true;env.motionEvents.get('change')()})
  assert.equal(env.timers.size,0)
  assert.equal(control(tree,'Pausar animación'),undefined)
 } finally {
  if(tree) await act(async()=>tree.unmount())
  assert.equal(env.timers.size,0);assert.equal(env.events.size,0);env.restore()
 }
})
