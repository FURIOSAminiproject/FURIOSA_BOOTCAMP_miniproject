const { spawn } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

function normalizeMode(rawMode) {
  if (rawMode === 'dev') return 'development';
  if (rawMode === 'prod' || rawMode === 'op') return 'production';
  return rawMode || 'local';
}

function createLaunch(rawMode, inherited = process.env) {
  const mode = normalizeMode(rawMode);
  if (!['local', 'development', 'production'].includes(mode)) throw new Error('Choose local, dev(elopment), or prod(uction)/op');
  const root = resolve(__dirname, '..');
  const envFile = resolve(root, '.env.' + mode);
  if (!existsSync(envFile)) throw new Error('Missing ' + envFile + '. Please create this environment file.');
  // Deployment environment variables override the selected file. No shared .env fallback.
  const env = { ...parseEnv(readFileSync(envFile, 'utf8')), ...inherited, APP_ENV: mode, NODE_ENV: mode === 'production' ? 'production' : 'development' };
  const args = mode !== 'production' ? ['--import', 'tsx', '--watch', 'src/main.ts'] : ['dist/main.js'];
  return { root, envFile, env, args };
}
module.exports = { createLaunch };
if (require.main === module) {
  try {
    const config = createLaunch(process.argv[2]);
    const child = spawn(process.execPath, config.args, { cwd: config.root, env: config.env, stdio: 'inherit', windowsHide: true });
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
