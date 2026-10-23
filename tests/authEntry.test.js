import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
const root=fileURLToPath(new URL('../',import.meta.url))
const temp=await mkdtemp(join(root,'.messa-auth-tests-'))
await build({entryPoints:[join(root,'src/pages/AuthPage.jsx')],outfile:join(temp,'auth.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'mock-services',setup(b){
 b.onResolve({filter:/context\/AuthContext$/},()=>({path:'auth',namespace:'mock'}))
 b.onResolve({filter:/lib\/supabase$/},()=>({path:'supabase',namespace:'mock'}))
 b.onResolve({filter:/auth\/FeatureCarousel$/},()=>({path:'carousel',namespace:'mock'}))
 b.onResolve({filter:/^react-hot-toast$/},()=>({path:'toast',namespace:'mock'}))
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({loader:'js',contents:path==='auth'?'export const useAuth=()=>globalThis.__entryAuth':path==='supabase'?'export const supabase={auth:{}}':path==='carousel'?'export default function Carousel(){return null}':'export default {success(){},error(){}}'}))
}}]})
const {default:Auth}=await import(pathToFileURL(join(temp,'auth.mjs')).href)
after(()=>rm(temp,{recursive:true,force:true}))
let historyNavigate
function Location(){const location=useLocation();historyNavigate=useNavigate();return React.createElement('output',{},location.pathname)}
function button(view,label){return view.root.findAllByType('button').find(n=>n.children.join('')===label)}
function setup(state){let view;act(()=>{view=create(React.createElement(MemoryRouter,{initialEntries:[{pathname:'/',state}]},React.createElement(Auth),React.createElement(Location)))});return view}
test('entry opens registration, login and recovery without leaving the home URL',()=>{
 globalThis.__entryAuth={signIn:async()=>{},signUp:async()=>({session:null})}
 const view=setup()
 assert.equal(view.root.findByType('h1').props.id,'auth-title')
 assert.equal(view.root.findAllByType('a').filter(n=>n.props.href!=='/')[0].props.href,'/carta/comeycalla-mp3s28ri/menu')
 act(()=>button(view,'Crear cuenta gratis').props.onClick())
 assert.equal(view.root.findByType('form').props['aria-busy'],false)
 act(()=>button(view,'Inicia sesión').props.onClick())
 assert.equal(view.root.findByProps({id:'auth-password'}).props.autoComplete,'current-password')
 act(()=>button(view,'¿Olvidaste tu contraseña?').props.onClick())
 assert.equal(view.root.findAllByType('input').length,1)
 assert.equal(view.root.findByType('output').children.join(''),'/')
 act(()=>view.unmount())
})
test('registration preserves account confirmation and legacy login state opens the login form',async()=>{
 const calls=[];globalThis.__entryAuth={signIn:async()=>{},signUp:async(...args)=>{calls.push(args);return {session:null}}}
 const view=setup()
 act(()=>button(view,'Crear cuenta gratis').props.onClick())
 act(()=>view.root.findByProps({id:'auth-email'}).props.onChange({target:{value:'demo@example.test'}}))
 act(()=>view.root.findByProps({id:'auth-password'}).props.onChange({target:{value:'example-password'}}))
 await act(async()=>view.root.findByType('form').props.onSubmit({preventDefault(){}}))
 assert.deepEqual(calls,[['demo@example.test','example-password']])
 assert.match(view.root.findByType('h1').children.join(''),/Revisa/)
 act(()=>button(view,'Ir a iniciar sesión').props.onClick())
 assert.equal(view.root.findByType('output').children.join(''),'/')
 act(()=>view.unmount())
 const legacy=setup({authMode:'login'})
 assert.equal(legacy.root.findByProps({id:'auth-password'}).props.autoComplete,'current-password')
 act(()=>legacy.unmount())
})

test('browser back and forward restore auth screens on the same URL',()=>{
 globalThis.__entryAuth={signIn:async()=>{},signUp:async()=>({session:null})}
 const view=setup()
 act(()=>button(view,'Crear cuenta gratis').props.onClick())
 assert.equal(view.root.findByProps({id:'auth-password'}).props.autoComplete,'new-password')
 act(()=>historyNavigate(-1))
 assert.equal(view.root.findAllByType('form').length,0)
 act(()=>historyNavigate(1))
 assert.equal(view.root.findByProps({id:'auth-password'}).props.autoComplete,'new-password')
 act(()=>button(view,'Inicia sesión').props.onClick())
 act(()=>button(view,'¿Olvidaste tu contraseña?').props.onClick())
 act(()=>historyNavigate(-1))
 assert.equal(view.root.findByProps({id:'auth-password'}).props.autoComplete,'current-password')
 act(()=>view.root.findAllByType('button').find(n=>n.props.className==='messa-register-back').props.onClick())
 assert.equal(view.root.findByProps({id:'auth-password'}).props.autoComplete,'new-password')
 assert.equal(view.root.findByType('output').children.join(''),'/')
 act(()=>view.unmount())
})
