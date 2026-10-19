const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

// 운영 환경(.env.production) 파일 로드
const envFile = resolve(__dirname, '.env.production');
let envConfig = {};
if (existsSync(envFile) && typeof parseEnv === 'function') {
  try {
    envConfig = parseEnv(readFileSync(envFile, 'utf8'));
  } catch (err) {
    console.warn('[PM2 Warning] .env.production 파싱 실패:', err.message);
  }
}

module.exports = {
  apps: [
    {
      name: 'travel-backend',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        APP_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
        ...envConfig,
      },
    },
  ],
};
