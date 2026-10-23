const { createLaunch } = require('./scripts/start.cjs');
const { env } = createLaunch('production');

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
        PORT: 3001,
        HOST: '127.0.0.1',
        ...env,
      },
    },
  ],
};
