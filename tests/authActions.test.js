import test from 'node:test'
import assert from 'node:assert/strict'
import { requestPasswordReset } from '../src/lib/authActions.js'

test('envía la recuperación al dominio actual, tanto en desarrollo como en producción', async () => {
  for (const origin of ['http://localhost:5173', 'https://mi-carta-app.vercel.app']) {
    let request
    const auth = {
      async resetPasswordForEmail(...args) {
        request = args
        return { data: {}, error: null }
      },
    }
    await requestPasswordReset(auth, ' usuario@example.com ', origin)
    assert.deepEqual(request, ['usuario@example.com', { redirectTo: `${origin}/reset-password` }])
  }
})

test('un error devuelto por Supabase impide confirmar el envío', async () => {
  const failure = new Error('Email rate limit exceeded')
  const auth = { resetPasswordForEmail: async () => ({ data: null, error: failure }) }
  await assert.rejects(requestPasswordReset(auth, 'usuario@example.com', 'http://localhost:5173'), failure)
})

test('un fallo de red se propaga para permitir reintentar desde el formulario', async () => {
  const failure = new TypeError('Failed to fetch')
  const auth = { resetPasswordForEmail: async () => { throw failure } }
  await assert.rejects(requestPasswordReset(auth, 'usuario@example.com', 'http://localhost:5173'), failure)
})
