"""배포 사전 검사를 격리된 폴더와 모의 Docker로 확인한다. 실제 배포는 하지 않는다."""
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
HELPER = Path('CI_CD/BackEnd/nestjs/prepare-env.sh')
BASH = os.environ.get('TEST_BASH', shutil.which('bash') or 'bash')


class BackendEnvTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='furiosa-env-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for relative in (HELPER, Path('CI_CD/FrontEnd/deploy.sh'),
                         Path('CI_CD/BackEnd/nestjs/deploy.sh')):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)
            # Linux 운영 파일의 LF를 유지한다. Windows checkout의 CRLF는 fixture에서 정규화한다.
            target.write_bytes(target.read_text(encoding='utf-8').encode('utf-8'))
        helper = self.root / HELPER
        helper.write_text(helper.read_text(encoding='utf-8').replace(
            '/home/ec2-user', str(self.root / 'ec2-home').replace('\\', '/')),
            encoding='utf-8', newline='\n')
        (self.root / 'BackEnd/NestJS').mkdir(parents=True)
        (self.root / 'home').mkdir()
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        # Windows에서도 Store의 python3 별칭 대신 테스트 실행 Python을 사용한다.
        self.command('python3', 'exec ' + shlex.quote(sys.executable.replace('\\', '/')) + ' "$@"\n')
        self.command('docker', '''
if [[ "$*" == *"config --format json"* ]]; then
    printf '%s' "$MOCK_COMPOSE_JSON"
    exit "$MOCK_CONFIG_EXIT"
fi
echo docker >> "$MUTATION_LOG"
exit 99
''')
        for command in ('systemctl', 'sudo', 'curl', 'sleep', 'tar'):
            self.command(command, 'echo ' + command + ' >> "$MUTATION_LOG"\nexit 99\n')
        self.env = dict(os.environ)
        self.env.update({
            'PATH': str(self.bin) + os.pathsep + os.environ['PATH'],
            'HOME': str(self.root / 'home').replace('\\', '/'),
            'APP_ENV': 'production',
            'MOCK_CONFIG_EXIT': '0',
            'PYTHONIOENCODING': 'utf-8',
            'MUTATION_LOG': str(self.root / 'mutations').replace('\\', '/'),
        })
        self.values = dict(DB_HOST='db.example.test', DB_NAME='test_db',
                           DB_USER='test_user', DB_PASSWORD='test-only-value',
                           JWT_SECRET='x' * 48, DB_SSL='false')

    def command(self, name, body):
        path = self.bin / name
        path.write_text('#!/usr/bin/env bash\n' + body, encoding='utf-8', newline='\n')
        path.chmod(0o700)

    def target(self, mode='production'):
        return self.root / 'BackEnd/NestJS' / ('.env.' + mode)

    def run_script(self, relative=HELPER):
        self.env['MOCK_COMPOSE_JSON'] = json.dumps({'services': {'backend': {'environment': self.values}}})
        return subprocess.run([BASH, str(self.root / relative).replace('\\', '/')],
                              cwd=self.root, env=self.env, text=True,
                              encoding='utf-8', capture_output=True, timeout=20)

    def test_missing_file_stops_both_deploy_paths(self):
        for path in ('CI_CD/FrontEnd/deploy.sh', 'CI_CD/BackEnd/nestjs/deploy.sh'):
            result = self.run_script(Path(path))
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('.env.production', result.stderr)
            self.assertFalse((self.root / 'mutations').exists())

    def test_existing_file_is_preserved_and_values_are_not_logged(self):
        self.target().write_text('existing-file\n', encoding='utf-8')
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.target().read_text(), 'existing-file\n')
        self.assertNotIn(self.values['DB_PASSWORD'], result.stdout + result.stderr)
        self.assertNotIn(self.values['JWT_SECRET'], result.stdout + result.stderr)

    def test_restore_home_file_for_each_environment(self):
        for mode in ('local', 'development', 'production'):
            with self.subTest(mode=mode):
                self.env['APP_ENV'] = mode
                source = self.root / 'home' / ('.env.' + mode)
                source.write_text('restored-test-file\n', encoding='utf-8')
                result = self.run_script()
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(self.target(mode).read_text(), source.read_text())
                if os.name != 'nt':
                    self.assertEqual(self.target(mode).stat().st_mode & 0o777, 0o600)

    def test_each_required_database_value_is_rejected_when_empty(self):
        self.target().touch()
        for key in ('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'):
            with self.subTest(key=key):
                previous = self.values[key]
                self.values[key] = '   '
                result = self.run_script()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(key, result.stderr)
                self.values[key] = previous

    def test_short_jwt_secret_is_rejected(self):
        self.target().touch()
        self.values['JWT_SECRET'] = 'x' * 31
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('JWT_SECRET', result.stderr)
        self.values['JWT_SECRET'] = ' ' * 40
        self.assertNotEqual(self.run_script().returncode, 0)

    def test_env_content_is_never_executed(self):
        marker = self.root / 'should-not-exist'
        self.target().write_text('JWT_SECRET=$(touch "' + marker.as_posix() + '")\n', encoding='utf-8')
        self.assertEqual(self.run_script().returncode, 0)
        self.assertFalse(marker.exists())

    def test_compose_parse_errors_do_not_log_secret_values(self):
        self.target().touch()
        self.command('docker', 'echo "secret-value-from-invalid-env" >&2\nexit 71\n')
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('secret-value-from-invalid-env', result.stdout + result.stderr)

    def test_invalid_port_and_ssl_are_rejected(self):
        self.target().touch()
        for key, value in (('DB_PORT', '0'), ('DB_PORT', '65536'),
                           ('DB_PORT', 'abc'), ('DB_SSL', 'invalid')):
            with self.subTest(key=key, value=value):
                self.values[key] = value
                result = self.run_script()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(key, result.stderr)
                self.values.pop('DB_PORT', None)
                self.values['DB_SSL'] = 'false'

    def test_compose_failure_is_not_hidden_by_successful_validator(self):
        self.target().touch()
        self.env['MOCK_CONFIG_EXIT'] = '71'
        self.assertNotEqual(self.run_script().returncode, 0)

    def test_unsupported_environment_fails(self):
        self.env['APP_ENV'] = '../unexpected'
        self.assertNotEqual(self.run_script().returncode, 0)

    def test_both_deploy_paths_stop_before_mutations_for_missing_database(self):
        self.target().touch()
        self.values.pop('DB_HOST')
        for path in ('CI_CD/FrontEnd/deploy.sh', 'CI_CD/BackEnd/nestjs/deploy.sh'):
            with self.subTest(path=path):
                result = self.run_script(Path(path))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('DB_HOST', result.stderr)
                self.assertFalse((self.root / 'mutations').exists())
                self.assertFalse((self.root / 'backups').exists())

    def test_valid_settings_reach_deployment_after_validation(self):
        self.target().touch()
        dist = self.root / 'BackEnd/NestJS/dist'
        dist.mkdir()
        (dist / 'main.js').write_text('fixture')
        (dist.parent / 'package.json').write_text('{}')
        self.command('docker', '''
if [[ "$*" == *"config --format json"* ]]; then
    echo config >> "$MUTATION_LOG"
    printf '%s' "$MOCK_COMPOSE_JSON"
else
    echo docker-up >> "$MUTATION_LOG"
fi
''')
        for name in ('sudo', 'curl', 'sleep', 'systemctl'):
            self.command(name, 'echo ' + name + ' >> "$MUTATION_LOG"\nexit 0\n')
        self.command('tar', '''
echo tar >> "$MUTATION_LOG"
while [ "$#" -gt 0 ]; do
    if [ "$1" = "-czf" ]; then shift; printf fixture > "$1"; break; fi
    shift
done
''')
        for relative in ('CI_CD/FrontEnd/deploy.sh', 'CI_CD/BackEnd/nestjs/deploy.sh'):
            with self.subTest(relative=relative):
                log = self.root / 'mutations'
                if log.exists():
                    log.unlink()
                result = self.run_script(Path(relative))
                self.assertEqual(result.returncode, 0, result.stderr)
                calls = log.read_text().splitlines()
                self.assertEqual(calls[0], 'config')
                self.assertIn('docker-up', calls)


@unittest.skipUnless(shutil.which('docker'), 'Docker Compose CLI unavailable')
class ComposeConfigTests(unittest.TestCase):
    def test_real_compose_env_resolution_in_all_modes(self):
        # config는 Docker daemon에 접속하거나 컨테이너를 시작하지 않는다.
        with tempfile.TemporaryDirectory(prefix='furiosa-compose-env-') as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / 'docker-compose.yml', root / 'docker-compose.yml')
            backend = root / 'BackEnd/NestJS'
            backend.mkdir(parents=True)
            for mode in ('local', 'development', 'production'):
                (backend / ('.env.' + mode)).write_text(
                    'DB_HOST=db.example.test\nDB_PORT=5432\nDB_USER=fixture\n'
                    'DB_PASSWORD=test-only-value\nDB_NAME=travel_' + mode +
                    '\nJWT_SECRET=' + 'x' * 48 + '\nDB_SSL=false\nPORT=9999\nHOST=wrong\n',
                    encoding='utf-8')
            for mode in ('local', 'development', 'production'):
                with self.subTest(mode=mode):
                    env = dict(os.environ, APP_ENV=mode)
                    result = subprocess.run(['docker', 'compose', '--project-directory', str(root),
                        '-f', str(root / 'docker-compose.yml'), 'config', '--format', 'json'],
                        capture_output=True, text=True, encoding='utf-8', env=env, timeout=30)
                    self.assertEqual(result.returncode, 0, 'Compose config failed for ' + mode)
                    values = json.loads(result.stdout)['services']['backend']['environment']
                    self.assertEqual(values['DB_NAME'], 'travel_' + mode)
                    self.assertEqual(values['APP_ENV'], mode)
                    self.assertEqual(values['PORT'], '3001')
                    self.assertEqual(values['HOST'], '0.0.0.0')


if __name__ == '__main__':
    unittest.main()
