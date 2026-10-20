const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLaunch } = require('../scripts/start.cjs');
test('DEV and PROD select separate files and entry points', () => {
  const local = createLaunch('local', {});
  assert.equal(local.env.APP_ENV, 'local');
  assert.equal(local.env.NODE_ENV, 'development');
  assert.equal(local.env.DB_NAME, 'travel_local');
  const dev = createLaunch('development', {});
  const prod = createLaunch('production', {});
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
test('deployment variables take priority and mode is explicit', () => {
  const config = createLaunch('production', { DB_PASSWORD: 'test-only-value', NODE_ENV: 'development' });
  assert.equal(config.env.DB_PASSWORD, 'test-only-value');
  assert.equal(config.env.NODE_ENV, 'production');
});
