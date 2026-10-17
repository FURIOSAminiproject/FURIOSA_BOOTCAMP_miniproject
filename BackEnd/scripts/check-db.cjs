const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createLaunch } = require('./start.cjs');

try {
  const config = createLaunch(process.argv[2] || 'local');
  const tsFile = resolve(config.root, 'src', 'database', 'check.ts');

  // tsx가 있으면 빌드 없이 ts 파일을 즉시 실행, 없으면 dist js 파일 실행
  const execArgs = existsSync(tsFile)
    ? ['--import', 'tsx', 'src/database/check.ts']
    : ['dist/database/check.js'];

  const result = spawnSync(process.execPath, execArgs, {
    cwd: config.root,
    env: config.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
