import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMenuSlides } from '../src/lib/menuSlides.js'

test('el carrusel admite imágenes web y rechaza datos dañados o esquemas ejecutables', () => {
  assert.deepEqual(normalizeMenuSlides(null), [])
  assert.deepEqual(normalizeMenuSlides({ image_url: 'https://example.com/a.jpg' }), [])
  const slides = normalizeMenuSlides([null, { image_url: 'javascript:alert(1)' }, { image_url: 'file:///etc/passwd' }, { id: 'oferta', image_url: 'https://example.com/a.jpg', title: 'Oferta semanal' }])
  assert.deepEqual(slides, [{ id: 'oferta', image_url: 'https://example.com/a.jpg', title: 'Oferta semanal' }])
  assert.equal(normalizeMenuSlides(Array(10).fill({ image_url: 'https://example.com/a.jpg' })).length, 6)
})
