const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const rawMode = process.argv[2] || 'production';
const mode = rawMode === 'op' || rawMode === 'prod' ? 'production' : (rawMode === 'dev' ? 'development' : rawMode);

if (!['local', 'development', 'production'].includes(mode)) {
  console.error('Invalid environment mode: ' + rawMode + '. Choose local, development, or production/op.');
  process.exit(1);
}

const root = resolve(__dirname, '..');
const envFile = resolve(root, '.env.' + mode);

if (!existsSync(envFile)) {
  console.warn('[WARN] Missing ' + envFile + '. Create this file if environment variables are needed.');
} else {
  console.log('[Build] Compiling for ' + mode + ' environment (.env.' + mode + ' checked)...');
}

const tscBin = resolve(root, 'node_modules', 'typescript', 'bin', 'tsc');
const result = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exitCode = result.status ?? 0;
