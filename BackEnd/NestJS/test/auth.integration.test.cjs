const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { getRepositoryToken } = require('@nestjs/typeorm');
const { DataSource } = require('typeorm');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/configure-app');
const { User } = require('../dist/users/entities/user.entity');

test('merged auth routes preserve sessions, OAuth state and the existing API prefix', async () => {
  Object.assign(process.env, {
    DB_HOST: '127.0.0.1', DB_USER: 'test', DB_PASSWORD: 'test', DB_NAME: 'auth_test',
    JWT_SECRET: 'offline-auth-test-secret-at-least-32-characters', NODE_ENV: 'development',
    GOOGLE_CLIENT_ID: 'offline-client', GOOGLE_CLIENT_SECRET: 'offline-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3001/auth/google/callback',
    FRONTEND_URL: 'http://localhost:3000',
  });
  const users = [];
  const repository = {
    findOne: async ({ where }) => users.find(user => Object.entries(where).every(([k, v]) => user[k] === v)) || null,
    create: data => ({ id: String(users.length + 1), createdAt: new Date(), ...data }),
    save: async user => { users.push(user); return user; },
    createQueryBuilder: () => {
      let email;
      const query = {
        addSelect: () => query,
        where: (_, params) => { email = params.email; return query; },
        getOne: async () => users.find(user => user.email === email) || null,
      };
      return query;
    },
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DataSource).useValue({ isInitialized: true, query: async () => [{ value: 1 }], destroy: async () => {} })
    .overrideProvider(getRepositoryToken(User)).useValue(repository).compile();
  const app = module.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const originalFetch = global.fetch;
  let tokenCalls = 0;
  let profileCalls = 0;
  // OAuth 서버·DB를 실제 호출하지 않고 콜백부터 세션 발급까지 연결한다.
  global.fetch = async (url, options) => {
    if (String(url).startsWith(base + '/')) return originalFetch(url, options);
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      tokenCalls++;
      assert.equal(options.body.get('code'), 'offline-code');
      return Response.json({ access_token: 'offline-access-token' });
    }
    if (String(url) === 'https://openidconnect.googleapis.com/v1/userinfo') {
      profileCalls++;
      assert.equal(options.headers.Authorization, 'Bearer offline-access-token');
      return Response.json({ sub: 'google-user', email: 'google@example.com', email_verified: true, name: 'Google User' });
    }
    throw new Error('Unexpected external request');
  };
  const post = (path, body, cookie) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body), redirect: 'manual',
  });
  const sessionCookie = response => response.headers.get('set-cookie').split(';')[0];
  try {
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.equal((await fetch(base + '/auth/me')).status, 200);
    assert.equal((await fetch(base + '/api/auth/me')).status, 404);
    const payload = { name: 'Local User', email: 'local@example.com', password: 'test-password' };
    assert.equal((await post('/auth/register', payload)).status, 201);
    assert.notEqual(users[0].passwordHash, payload.password);
    assert.equal((await post('/auth/register', payload)).status, 409);
    assert.equal((await post('/auth/login', { email: payload.email, password: 'wrong' })).status, 401);
    const login = await post('/auth/login', payload);
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    const cookie = sessionCookie(login);
    const me = await fetch(base + '/auth/me', { headers: { Cookie: cookie } });
    const identity = await me.json();
    assert.equal(identity.authenticated, true);
    assert.equal(identity.user.email, payload.email);
    assert.equal('passwordHash' in identity.user, false);
    const logout = await post('/auth/logout', {}, cookie);
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /trip_session=;/);
    const start = await fetch(base + '/auth/google', { redirect: 'manual' });
    assert.equal(start.status, 302);
    const state = new URL(start.headers.get('location')).searchParams.get('state');
    assert.ok(state);
    assert.match(start.headers.get('set-cookie'), /Path=\/auth\/google\/callback/);
    const stateCookie = sessionCookie(start);
    const rejected = await fetch(base + '/auth/google/callback?code=offline-code&state=wrong', {
      redirect: 'manual', headers: { Cookie: stateCookie },
    });
    assert.match(rejected.headers.get('location'), /oauth=error/);
    assert.equal(tokenCalls, 0);
    const callback = await fetch(base + '/auth/google/callback?code=offline-code&state=' + state, {
      redirect: 'manual', headers: { Cookie: stateCookie },
    });
    assert.equal(callback.headers.get('location'), 'http://localhost:3000/?oauth=success');
    const oauthCookie = callback.headers.getSetCookie().find(value => value.startsWith('trip_session=')).split(';')[0];
    const oauthMe = await fetch(base + '/auth/me', { headers: { Cookie: oauthCookie } });
    assert.equal((await oauthMe.json()).user.provider, 'google');
    assert.equal(tokenCalls, 1);
    assert.equal(profileCalls, 1);
    assert.equal(users.length, 2);
  } finally {
    global.fetch = originalFetch;
    await app.close();
  }
});
