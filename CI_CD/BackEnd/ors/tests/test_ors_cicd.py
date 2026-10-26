"""로컬 전용 검증. Docker/ORS 엔진을 실행하지 않고 준비·배포 실패 분기를 확인한다."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
BASH = shutil.which("bash")
if os.name == "nt":
    git_bash = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Git/bin/bash.exe"
    BASH = str(git_bash) if git_bash.is_file() else None
MODULES = ROOT / 'CI_CD/BackEnd/ors'
sys.path.insert(0, str(MODULES))
import prepare
import smoke


class OrsChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ors-verify-')
        self.root = Path(self.temp.name).resolve()
        assert self.root != ROOT and ROOT not in self.root.parents
        self.addCleanup(self.temp.cleanup)
        self.source = self.root / 'input.osm.pbf'
        self.source.write_bytes(b'local-test-snapshot')
        self.config = {
            'data_root': (self.root/'data').as_posix(),
            'dataset_path': self.source.as_posix(),
            'dataset_sha256': hashlib.sha256(self.source.read_bytes()).hexdigest(),
            'probe_coordinates': [[126.97, 37.56], [126.98, 37.57]],
            'http_port': 18082,
        }
        self.file = self.root / 'deployment.json'
        self.write_config()

    def write_config(self):
        self.file.write_text(json.dumps(self.config), encoding='utf-8')

    def test_snapshot_and_reuse_preserve_existing_graphs(self):
        config = prepare.load_config(self.file)
        env = self.root/'compose.env'
        first = prepare.prepare(config, env)
        graph = config['data_root']/'releases'/first['release_id']/'graphs'/'existing'
        graph.write_text('keep')
        second = prepare.prepare(config, env)
        self.assertEqual(first, second)
        self.assertEqual(graph.read_text(), 'keep')
        self.assertIn('ORS_HTTP_PORT=18082', env.read_text())
        self.assertFalse((config['data_root']/'last-successful.json').exists())

    def test_bad_checksum_does_not_create_store(self):
        config = prepare.load_config(self.file)
        config['dataset_sha256'] = '0'*64
        with self.assertRaises(ValueError):
            prepare.prepare(config, self.root/'env')
        self.assertFalse(config['data_root'].exists())

    def test_damaged_stored_snapshot_is_not_overwritten(self):
        config = prepare.load_config(self.file)
        prepare.prepare(config, self.root/'env')
        snapshot = config['data_root']/'datasets'/config['dataset_sha256']/'input.osm.pbf'
        snapshot.write_bytes(b'damaged')
        with self.assertRaises(ValueError):
            prepare.prepare(config, self.root/'env')
        self.assertEqual(snapshot.read_bytes(), b'damaged')

    def test_new_data_uses_new_graph_directory(self):
        first = prepare.prepare(prepare.load_config(self.file), self.root/'env')
        self.source.write_bytes(b'new-snapshot')
        self.config['dataset_sha256'] = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.write_config()
        second = prepare.prepare(prepare.load_config(self.file), self.root/'env')
        self.assertNotEqual(first['release_id'], second['release_id'])
        self.assertTrue((self.root/'data/releases'/first['release_id']).is_dir())

    def test_activate_records_prepared_config_not_changed_checkout(self):
        config = prepare.load_config(self.file)
        env = self.root/'env'
        first = prepare.prepare(config, env)
        original = Path.read_bytes
        with patch.object(Path, 'read_bytes', lambda path: b'changed checkout' if path == ROOT/'Docker/ors/ors-config.yml' else original(path)):
            activated = prepare.activate(config, env)
        self.assertEqual(first, activated)
        self.assertEqual(json.loads((self.root/'data/last-successful.json').read_text()), first)

    def test_activate_rejects_changed_snapshot(self):
        config = prepare.load_config(self.file)
        env = self.root/'env'
        prepare.prepare(config, env)
        snapshot = self.root/'data/datasets'/config['dataset_sha256']/'input.osm.pbf'
        snapshot.write_bytes(b'changed')
        with self.assertRaises(ValueError):
            prepare.activate(config, env)
        self.assertFalse((self.root/'data/last-successful.json').exists())

    def test_new_image_uses_new_graph_directory(self):
        config = prepare.load_config(self.file)
        first = prepare.prepare(config, self.root/'env')
        with patch.object(prepare, 'IMAGE', 'different-pinned-image'):
            second = prepare.prepare(config, self.root/'env')
        self.assertNotEqual(first['release_id'], second['release_id'])

    def test_new_ors_config_uses_new_graph_directory(self):
        config = prepare.load_config(self.file)
        first = prepare.prepare(config, self.root/'env')
        original = Path.read_bytes
        with patch.object(Path, 'read_bytes', lambda path: b'new config' if path == ROOT/'Docker/ors/ors-config.yml' else original(path)):
            second = prepare.prepare(config, self.root/'env')
        self.assertNotEqual(first['release_id'], second['release_id'])

    def test_invalid_config_boundaries(self):
        mutations = [
            ('data_root', ROOT.as_posix()), ('dataset_path', (ROOT/'map.osm.pbf').as_posix()),
            ('data_root', 'relative/path'), ('data_root', self.config['data_root']+'$bad'),
            ('dataset_sha256', 'bad'), ('http_port', True), ('http_port', 70000),
            ('probe_coordinates', [[1,2],[1,2]]), ('probe_coordinates', [[181,2],[2,3]]),
            ('probe_coordinates', [[1, float('nan')],[2,3]]),
        ]
        for key, value in mutations:
            with self.subTest(key=key, value=value):
                original = self.config[key]
                self.config[key] = value
                self.write_config()
                with self.assertRaises(ValueError):
                    prepare.load_config(self.file)
                self.config[key] = original

    def route(self):
        return {'features':[{'geometry':{'type':'LineString','coordinates':[[126.97,37.56],[126.98,37.57]]},
            'properties':{'summary':{'distance':100,'duration':20}, 'segments':[{'steps':[{'duration':20}]}]}}]}

    def test_smoke_checks_both_modes_and_both_preferences(self):
        def respond(url, body=None, **kwargs):
            return {'status':'ready'} if body is None else self.route()
        with patch.object(smoke, 'request', side_effect=respond) as calls:
            smoke.check(prepare.load_config(self.file), 1)
        routes = calls.call_args_list[1:]
        self.assertEqual(len(routes), 4)
        self.assertEqual({item.args[1]['preference'] for item in routes}, {'recommended','shortest'})
        self.assertEqual({item.args[0].split('/directions/')[1].split('/')[0] for item in routes}, {'driving-car','foot-walking'})

    def test_smoke_rejects_invalid_geometry_distance_and_steps(self):
        for defect in ('geometry','duration','steps'):
            with self.subTest(defect=defect):
                route = self.route()
                feature = route['features'][0]
                if defect == 'geometry': feature['geometry']['type']='Point'
                if defect == 'duration': feature['properties']['summary']['duration']=float('inf')
                if defect == 'steps': feature['properties']['segments']=[{'steps':[]}]
                with patch.object(smoke, 'request', side_effect=lambda url, body=None, **kwargs: {'status':'ready'} if body is None else route):
                    with self.assertRaises(ValueError):
                        smoke.check(prepare.load_config(self.file), 1)

    def test_readiness_deadline(self):
        with patch.object(smoke, 'request', return_value={'status':'not ready'}), patch.object(smoke.time, 'monotonic', side_effect=[0,0,2]):
            with self.assertRaisesRegex(ValueError, 'deadline'):
                smoke.check(prepare.load_config(self.file), 1)

    def deploy(self, scenario='success'):
        # 실제 deploy.sh 제어 흐름을 실행하되 Docker/flock/HTTP 경로 검사만 대체한다.
        # prepare.py와 기존 JSON 검사 자체는 실제 Python 코드로 수행한다.
        trace = self.root/'calls.txt'
        env = os.environ.copy()
        if not BASH:
            self.skipTest('Bash is required for mocked deployment checks')
        env.update(ORS_DEPLOY_CONFIG=self.file.as_posix(), ORS_QA_TRACE=trace.as_posix(),
                   ORS_QA_SCENARIO=scenario, ORS_QA_PYTHON=Path(sys.executable).as_posix(),
                   ORS_DATA_ROOT=self.config['data_root'],
                   TMPDIR=self.root.as_posix(), PYTHONDONTWRITEBYTECODE='1')
        if scenario == 'first_install':
            # 쉘 연결 검사는 다운로드를 실행하지 않는다. 준비된 임시 JSON을 공급하고
            # 최초 HTTP/체크섬/파일 생성 동작은 test_bootstrap.py에서 별도로 검사한다.
            fixture = self.root/'bootstrap-fixture.json'
            fixture.write_bytes(self.file.read_bytes())
            self.file.unlink()
            env['ORS_QA_BOOTSTRAP_FIXTURE'] = fixture.as_posix()
        script = r'''
docker() {
  printf 'docker %s\n' "$*" >> "$ORS_QA_TRACE"
  case " $* " in
    *' info '*) printf '8589934592\n' ;;
    *' config '*) [ "$ORS_QA_SCENARIO" != config_fail ] ;;
    *' pull '*) [ "$ORS_QA_SCENARIO" != pull_fail ] ;;
    *' up '*) [ "$ORS_QA_SCENARIO" != up_fail ] ;;
    *) return 0 ;;
  esac
}
flock() { printf 'flock\n' >> "$ORS_QA_TRACE"; [ "$ORS_QA_SCENARIO" != locked ]; }
python3() {
  case "$1" in
    */preflight.py)
      printf 'preflight\n' >> "$ORS_QA_TRACE"
      ORS_QA_PREFLIGHT_COUNT=$(( ${ORS_QA_PREFLIGHT_COUNT:-0} + 1 ))
      [ "$ORS_QA_SCENARIO" != insufficient_resources ] || return 1
      if [ "$ORS_QA_SCENARIO" = resources_exhausted_before_up ] && [ "$ORS_QA_PREFLIGHT_COUNT" -ge 2 ]; then
        return 1
      fi
      return 0
      ;;
    */bootstrap.py)
      printf 'bootstrap\n' >> "$ORS_QA_TRACE"
      case " $* " in
        *' --field '*) ;; # 저장소 조회는 네트워크를 사용하지 않는다.
        *)
          [ "$ORS_QA_SCENARIO" != bootstrap_fail ] || return 1
          if [ -n "${ORS_QA_BOOTSTRAP_FIXTURE:-}" ]; then
            "$ORS_QA_PYTHON" -c 'import shutil,sys; shutil.copyfile(sys.argv[1], sys.argv[2])' \
              "$ORS_QA_BOOTSTRAP_FIXTURE" "$ORS_DEPLOY_CONFIG" || return 98
          fi
          # 실제 다운로드가 실행되는 것을 막는다. 다운로드 자체는 별도 HTTP 모의 테스트로 검사한다.
          test -f "$ORS_DEPLOY_CONFIG" || return 97
          ;;
      esac
      "$ORS_QA_PYTHON" "$@"
      ;;
    */smoke.py) printf 'smoke\n' >> "$ORS_QA_TRACE"; [ "$ORS_QA_SCENARIO" != smoke_fail ] ;;
    *) "$ORS_QA_PYTHON" "$@" ;;
  esac
}
export -f docker flock python3
# 자식 Bash에서 실제 명령이 호출되는 사고를 막기 위해 함수 대체가 적용됐는지 먼저 확인한다.
test "$(type -t docker)" = function && test "$(type -t flock)" = function && test "$(type -t python3)" = function || exit 99
bash CI_CD/BackEnd/ors/deploy.sh
'''
        result = subprocess.run([BASH,'-c',script],cwd=ROOT,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=60)
        return result, trace.read_text() if trace.exists() else ''

    def test_deploy_success_only_replaces_ors(self):
        result, trace = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('up --detach --no-deps ors', trace)
        self.assertNotIn('--build', trace)
        self.assertNotIn(' backend', trace)
        self.assertTrue((self.root/'data/last-successful.json').exists())

    def test_deploy_failures_do_not_mark_success(self):
        for scenario in ('config_fail','pull_fail','up_fail','smoke_fail','locked'):
            with self.subTest(scenario=scenario):
                (self.root/'calls.txt').unlink(missing_ok=True)
                result, trace = self.deploy(scenario)
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertFalse((self.root/'data/last-successful.json').exists())
                self.assertIn('flock', trace, result.stderr)
                if scenario != 'locked':
                    self.assertIn(' config ', trace, result.stderr)
                if scenario == 'smoke_fail':
                    self.assertIn('smoke', trace, result.stderr)
                if scenario in ('config_fail','pull_fail','locked'):
                    self.assertNotIn(' up ', trace)

    def test_first_install_bootstraps_before_replacing_ors(self):
        result, trace = self.deploy('first_install')
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertTrue(self.file.exists())
        self.assertLess(trace.index('bootstrap'), trace.index(' up '))
        self.assertTrue((self.root/'data/last-successful.json').exists())

    def test_bootstrap_failure_does_not_replace_service(self):
        result, trace = self.deploy('bootstrap_fail')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('flock', trace)
        self.assertNotIn(' up ', trace)
        self.assertFalse((self.root/'data/last-successful.json').exists())

    def test_insufficient_resources_stop_before_bootstrap_or_container_changes(self):
        result, trace = self.deploy('insufficient_resources')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('preflight', trace)
        self.assertNotIn('bootstrap', trace)
        self.assertNotIn(' up ', trace)
        self.assertNotIn(' pull ', trace)
        self.assertNotIn('flock', trace)
        self.assertFalse((self.root/'data').exists())

    def test_resources_are_checked_again_before_replacing_container(self):
        result, trace = self.deploy('resources_exhausted_before_up')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(trace.count('preflight'), 2)
        self.assertIn(' pull ', trace)
        self.assertNotIn(' up ', trace)
        self.assertFalse((self.root/'data/last-successful.json').exists())

    def test_deploy_bad_hash_stops_before_container_changes(self):
        self.config['dataset_sha256']='0'*64
        self.write_config()
        result, trace = self.deploy()
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn(' up ',trace)
        self.assertNotIn(' pull ',trace)


if __name__ == '__main__':
    unittest.main(verbosity=2)
