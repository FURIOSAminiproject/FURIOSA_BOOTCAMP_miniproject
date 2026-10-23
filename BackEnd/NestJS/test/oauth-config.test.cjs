const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { AuthService } = require('../dist/auth/auth.service');

function authorization(callback) {
  const service = new AuthService({}, {}, new ConfigService({
    GOOGLE_CLIENT_ID: 'offline-client', GOOGLE_CALLBACK_URL: callback,
  }));
  return service.getAuthorizationUrl('google');
}

test('Google supports HTTP loopback development and HTTPS domain callbacks', () => {
  for (const callback of [
    'http://localhost/auth/google/callback',
    'http://127.0.0.1:80/auth/google/callback',
    'http://[::1]/auth/google/callback',
    'https://travel.example.com/auth/google/callback',
  ]) {
    const { url, state } = authorization(callback);
    const params = new URL(url).searchParams;
    assert.equal(params.get('redirect_uri'), callback);
    assert.equal(params.get('response_type'), 'code');
    assert.equal(params.get('scope'), 'openid email profile');
    assert.equal(params.get('state'), state);
    assert.match(state, /^[a-f0-9]{64}$/);
  }
});

test('Google rejects public IP, insecure remote origin and incorrect callback path', () => {
  for (const callback of [
    'https://203.0.113.1/auth/google/callback',
    'https://[2001:db8::1]/auth/google/callback',
    'http://travel.example.com/auth/google/callback',
    'https://travel.example.com/api/auth/google/callback',
    'not-a-url',
  ]) {
    assert.throws(() => authorization(callback), error => error.getStatus() === 503);
  }
});
