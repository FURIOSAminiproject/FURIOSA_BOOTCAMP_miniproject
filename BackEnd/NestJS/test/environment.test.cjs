const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLaunch } = require('../scripts/start.cjs');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'oauth-environment-'));
  const root = join(parent, 'NestJS');
  mkdirSync(root);
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  return { parent, root };
}
test('DEV and PROD select separate files and entry points', t => {
  const { root } = fixture(t);
  const local = createLaunch('local', {}, root);
  assert.equal(local.env.APP_ENV, 'local');
  assert.equal(local.env.NODE_ENV, 'development');
  assert.equal(local.env.DB_NAME, 'travel_local');
  const dev = createLaunch('development', {}, root);
  const prod = createLaunch('production', {}, root);
  assert.ok(dev.envFile.endsWith('.env.development'));
  assert.ok(prod.envFile.endsWith('.env.production'));
  assert.equal(dev.env.DB_NAME, 'travel_test');
  assert.equal(prod.env.DB_NAME, 'travel_prod');
  assert.equal(dev.env.NODE_ENV, 'development');
  assert.equal(prod.env.NODE_ENV, 'production');
  assert.ok(dev.args.includes('--watch'));
  assert.deepEqual(prod.args, ['dist/main.js']);
  assert.throws(() => createLaunch('staging', {}), /Choose/);
});
test('deployment variables take priority and mode is explicit', t => {
  const { root } = fixture(t);
  const config = createLaunch('production', { DB_PASSWORD: 'test-only-value', NODE_ENV: 'development' }, root);
  assert.equal(config.env.DB_PASSWORD, 'test-only-value');
  assert.equal(config.env.NODE_ENV, 'production');
});
test('shared backend OAuth settings override service defaults, then system variables win', t => {
  const { parent, root } = fixture(t);
  writeFileSync(join(root, '.env.local'), 'DB_NAME=service_db\nFRONTEND_URL=http://localhost:3000\nJWT_SECRET=service-secret\n');
  writeFileSync(join(parent, '.env.local'), 'GOOGLE_CLIENT_ID=shared-client\nGOOGLE_CLIENT_SECRET=shared-secret\nGOOGLE_CALLBACK_URL=http://localhost/auth/google/callback\nFRONTEND_URL=http://localhost\nJWT_SECRET=shared-secret\n');
  writeFileSync(join(parent, '.env.production'), 'GOOGLE_CLIENT_ID=wrong-mode-client\n');
  const config = createLaunch('local', { GOOGLE_CLIENT_SECRET: 'inherited-secret' }, root);
  assert.equal(config.env.DB_NAME, 'service_db');
  assert.equal(config.env.GOOGLE_CLIENT_ID, 'shared-client');
  assert.equal(config.env.GOOGLE_CLIENT_SECRET, 'inherited-secret');
  assert.equal(config.env.GOOGLE_CALLBACK_URL, 'http://localhost/auth/google/callback');
  assert.equal(config.env.FRONTEND_URL, 'http://localhost');
  assert.equal(config.env.JWT_SECRET, 'shared-secret');
});
