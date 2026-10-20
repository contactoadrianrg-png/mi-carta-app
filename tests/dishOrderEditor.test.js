import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(join(root, '.messa-tests-order-'))
const output = join(temp, 'order.mjs')
await build({entryPoints:[join(root,'src/components/dashboard/DishOrderEditor.jsx')],outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'})
const {default:Editor} = await import(pathToFileURL(output).href)
after(async()=>{await rm(temp,{recursive:true,force:true})})
const dishes=[{id:'a',name:'Ensalada',price:8,available:true},{id:'b',name:'Sopa',price:5,available:false},{id:'c',name:'Postre',price:4,available:true}]
function list(tree){return tree.root.findByType('ol').findAllByType('h3').map(n=>n.children.join(''))}
function save(tree){return tree.root.findAllByType('button').find(n=>n.children.includes('Guardar orden'))}

test('se reordena con flechas, el fallo conserva el borrador y reintentar guarda la lista correcta',async()=>{
 let tree,fail=true,saved
 try{
  await act(async()=>{tree=create(React.createElement(Editor,{dishes,onSave:async next=>{if(fail)throw Error('offline');saved=next},onCancel(){},onReload(){}}))})
  assert.equal(save(tree).props.disabled,true)
  await act(async()=>tree.root.findByProps({'aria-label':'Bajar Ensalada'}).props.onClick())
  assert.deepEqual(list(tree),['Sopa','Ensalada','Postre'])
  await act(async()=>{await save(tree).props.onClick()})
  assert.match(tree.root.findByProps({role:'alert'}).children[0].children.join(''),/No se ha podido guardar/)
  assert.deepEqual(list(tree),['Sopa','Ensalada','Postre'])
  fail=false
  await act(async()=>{await save(tree).props.onClick()})
  assert.deepEqual(saved.map(d=>d.id),['b','a','c'])
 }finally{if(tree)await act(async()=>tree.unmount())}
})

test('arrastrar cambia la posición y cancelar conserva el orden original',async()=>{
 let tree,cancelled=false
 try{
  await act(async()=>{tree=create(React.createElement(Editor,{dishes,onSave(){},onCancel(){cancelled=true},onReload(){}}))})
  await act(async()=>tree.root.findByProps({'aria-label':'Arrastrar Postre'}).props.onDragStart({dataTransfer:{setData(){}}}))
  await act(async()=>tree.root.findAllByType('li')[0].props.onDrop({preventDefault(){}}))
  assert.deepEqual(list(tree),['Postre','Ensalada','Sopa'])
  await act(async()=>tree.root.findAllByType('button').find(n=>n.children.includes('Cancelar')).props.onClick())
  assert.equal(cancelled,true)
  assert.deepEqual(dishes.map(d=>d.id),['a','b','c'])
 }finally{if(tree)await act(async()=>tree.unmount())}
})
