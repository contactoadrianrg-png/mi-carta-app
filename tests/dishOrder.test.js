import test from 'node:test'
import assert from 'node:assert/strict'
import { moveDish, nextDishSortOrder } from '../src/lib/dishOrder.js'

test('mover platos conserva todos los datos y admite subir, bajar y destinos no válidos', () => {
  const dishes = [{ id: 'a', name: 'Uno' }, { id: 'b', name: 'Dos' }, { id: 'c', name: 'Tres' }]
  assert.deepEqual(moveDish(dishes, 'a', 'c').map(d=>d.id), ['b','c','a'])
  assert.deepEqual(moveDish(dishes, 'c', 'a').map(d=>d.id), ['c','a','b'])
  assert.deepEqual(dishes.map(d=>d.id), ['a','b','c'])
  assert.equal(moveDish(dishes, 'missing', 'a'), dishes)
  assert.equal(moveDish(dishes, 'a', 'a'), dishes)
})

test('los platos nuevos se añaden al final y un error al consultar el orden se propaga', async () => {
  const client = response => ({ from(){return { select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle:async()=>response }} })
  assert.equal(await nextDishSortOrder(client({data:null,error:null}), 'restaurant'), 0)
  assert.equal(await nextDishSortOrder(client({data:{sort_order:9},error:null}), 'restaurant'), 10)
  await assert.rejects(nextDishSortOrder(client({data:null,error:new Error('offline')}),'restaurant'), /offline/)
})
