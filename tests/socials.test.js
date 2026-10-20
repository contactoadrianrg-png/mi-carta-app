import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSocialUrl } from '../src/lib/socials.js'

test('Instagram accepts a pasted profile URL without duplicating its domain', () => {
  assert.equal(buildSocialUrl('instagram', ' https://www.instagram.com/messaapp/ '), 'https://instagram.com/messaapp')
  assert.equal(buildSocialUrl('instagram', '@messaapp'), 'https://instagram.com/messaapp')
  assert.equal(buildSocialUrl('instagram', 'instagram.com/messaapp'), 'https://instagram.com/messaapp')
})

test('Facebook and TikTok accept full URLs and profile names', () => {
  assert.equal(buildSocialUrl('facebook', 'facebook.com/messaapp'), 'https://facebook.com/messaapp')
  assert.equal(buildSocialUrl('facebook', 'https://www.facebook.com/messaapp/'), 'https://facebook.com/messaapp')
  assert.equal(buildSocialUrl('tiktok', 'https://www.tiktok.com/@messaapp'), 'https://tiktok.com/@messaapp')
  assert.equal(buildSocialUrl('tiktok', '@messaapp'), 'https://tiktok.com/@messaapp')
})

test('Empty profiles and links outside the expected social network are not rendered', () => {
  assert.equal(buildSocialUrl('instagram', 'https://instagram.com/'), null)
  assert.equal(buildSocialUrl('instagram', 'https://example.com/messaapp'), null)
  assert.equal(buildSocialUrl('facebook', 'javascript:alert(1)'), null)
  assert.equal(buildSocialUrl('tiktok', '  '), null)
})
