const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createLaunch } = require('./start.cjs');

try {
  const [mode, ...args] = process.argv.slice(2);
  if (!mode) throw new Error('Usage: npm run tour:ingest -- <local|dev|prod> [options]');
  if (mode === '--help') {
    console.log('Usage: npm run tour:ingest -- <local|dev|prod> [--mode initial|sync|festivals|detail|reference] [--help]');
  } else {
    const config = createLaunch(mode);
    const built = resolve(config.root, 'dist/places/ingest.js');
    const execArgs = config.env.APP_ENV === 'production'
      ? [built, ...args] : ['--import', 'tsx', 'src/places/ingest.ts', ...args];
    if (config.env.APP_ENV === 'production' && !existsSync(built)) throw new Error('Build first: npm run build');
    const child = spawn(process.execPath, execArgs, { cwd: config.root, env: config.env, stdio: 'inherit', windowsHide: true });
    child.on('error', () => { console.error('Could not start TourAPI ingestion'); process.exitCode = 1; });
    child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
