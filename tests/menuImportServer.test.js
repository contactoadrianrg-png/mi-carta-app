import test from 'node:test'
import assert from 'node:assert/strict'
import { createImportHandler } from '../supabase/functions/import-menu/handler.mjs'

const restaurantId='71766635-a2a6-42fc-be73-1b1b84bb6371'
const imageBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZAAAAABJRU5ErkJggg=='
const payload={restaurantId,imageBase64,mimeType:'image/png'}
const origin='https://mi-carta-app.vercel.app'
function request(body=payload,authorization='Bearer test-session') {return new Request('https://example.test/import-menu',{method:'POST',headers:{Origin:origin,...(authorization?{Authorization:authorization}:{})},body:JSON.stringify(body)})}
function setup({owner=true,valid=true,key='test-provider-secret',providerStatus=200,providerBody}={}) {
 const calls=[]
 const handler=createImportHandler({env:name=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public-test-key',GEMINI_API_KEY:key})[name],fetchImpl:async(url,options)=>{
  calls.push({url,options})
  if(url.endsWith('/auth/v1/user'))return Response.json(valid?{id:'test-owner'}:{},{status:valid?200:401})
  if(url.includes('/rest/v1/restaurants?'))return Response.json(owner?[{id:restaurantId}]:[])
  return Response.json(providerBody||{candidates:[{content:{parts:[{text:JSON.stringify({categorias:[{nombre:'Entrantes',platos:[{nombre:'Croquetas',descripcion:'Caseras',precio:8.5}]}]})}]}}]},{status:providerStatus})
 }})
 return {handler,calls}
}
test('rejects anonymous, expired or non-owner requests before contacting the provider',async()=>{
 for(const settings of [{valid:false},{owner:false}]){
  const {handler,calls}=setup(settings)
  const response=await handler(request())
  assert.equal(response.status,settings.owner===false?403:401)
  assert.equal(calls.some(c=>c.url.includes('googleapis')),false)
 }
 const {handler,calls}=setup()
 assert.equal((await handler(request(payload,null))).status,401)
 assert.equal(calls.length,0)
})
test('checks ownership with caller credentials and keeps provider key on server headers only',async()=>{
 const {handler,calls}=setup()
 const response=await handler(request())
 assert.equal(response.status,200)
 const json=await response.json()
 assert.equal(json.categorias[0].platos[0].precio,8.5)
 const ownership=new URL(calls[1].url)
 assert.equal(ownership.searchParams.get('owner_id'),'eq.test-owner')
 assert.equal(calls[1].options.headers.Authorization,'Bearer test-session')
 assert.equal(calls[2].options.headers['x-goog-api-key'],'test-provider-secret')
 assert.equal(calls[2].url.includes('test-provider-secret'),false)
 assert.equal(JSON.stringify(json).includes('test-provider-secret'),false)
 assert.equal(response.headers.get('access-control-allow-origin'),origin)
})
test('rejects unsupported or forged images and oversized requests',async()=>{
 const {handler,calls}=setup()
 for(const body of [{...payload,mimeType:'text/html'},{...payload,imageBase64:btoa('not a valid png image')},{...payload,restaurantId:'other'}])assert.equal((await handler(request(body))).status,400)
 const big=new Request('https://example.test/import-menu',{method:'POST',headers:{Authorization:'Bearer test-session','Content-Length':'9000000'},body:'{}'})
 assert.equal((await handler(big)).status,413)
 assert.equal(calls.some(c=>c.url.includes('googleapis')),false)
})
test('fails closed without a secret and sanitizes provider error bodies',async()=>{
 const missing=setup({key:''})
 assert.equal((await missing.handler(request())).status,503)
 assert.equal(missing.calls.length,2)
 const failed=setup({providerStatus:403,providerBody:{error:{message:'test-provider-secret should never be returned'}}})
 const response=await failed.handler(request())
 assert.equal(response.status,502)
 assert.equal((await response.text()).includes('test-provider-secret'),false)
})
test('limits bursts and rejects untrusted origins without contacting the provider',async()=>{
 const {handler,calls}=setup()
 for(let i=0;i<3;i++)assert.equal((await handler(request())).status,200)
 assert.equal((await handler(request())).status,429)
 assert.equal(calls.filter(c=>c.url.includes('googleapis')).length,3)
 const blocked=new Request('https://example.test/import-menu',{method:'OPTIONS',headers:{Origin:'https://untrusted.test'}})
 assert.equal((await handler(blocked)).status,403)
})
