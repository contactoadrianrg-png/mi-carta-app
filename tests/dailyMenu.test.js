import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyDailyMenu, normalizeDailyMenu, dailyMenuFromForm, dailyMenuToForm } from '../src/lib/dailyMenu.js'

test('el menú admite opciones independientes, coma decimal y guardar borradores ocultos', () => {
  const form = { ...dailyMenuToForm(null), enabled: true, price: '12,50', firsts: ' Sopa\n\nEnsalada ', seconds: 'Pollo\nPasta' }
  const menu = dailyMenuFromForm(form)
  assert.deepEqual(menu.firsts, ['Sopa', 'Ensalada'])
  assert.equal(menu.price, 12.5)
  assert.equal(dailyMenuToForm(menu).seconds, 'Pollo\nPasta')
  assert.deepEqual(normalizeDailyMenu(emptyDailyMenu()), emptyDailyMenu())
})
test('no publica precios incompletos ni menús vacíos y rechaza datos inválidos', () => {
  const valid = { ...emptyDailyMenu(), enabled: true, price: 12.5, firsts: ['Sopa'] }
  for (const value of [null, {}, { ...valid, price: -1 }, { ...valid, price: 12.555 }, { ...valid, price: null }, { ...valid, firsts: [] }, { ...valid, seconds: Array(11).fill('Pollo') }, { ...valid, image_url: 'javascript:alert(1)' }]) assert.equal(normalizeDailyMenu(value), null)
  assert.throws(() => dailyMenuFromForm({ ...dailyMenuToForm(null), enabled: true }), /precio/)
  assert.throws(() => dailyMenuFromForm({ ...dailyMenuToForm(null), enabled: true, price: '12.5' }), /primero o un segundo/)
})
