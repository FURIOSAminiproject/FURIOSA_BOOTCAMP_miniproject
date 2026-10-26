"""최초 서버 준비를 임시 파일과 모의 HTTPS 응답으로 검사한다."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

MODULES = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MODULES))
import bootstrap
from prepare import load_config


class Response(io.BytesIO):
    """실제 네트워크 없이 urllib 응답의 본문·최종 URL·헤더만 제공하는 테스트 대역."""
    def __init__(self, data, url, headers=None):
        super().__init__(data)
        self.url = url
        self.headers = headers or {}

    def geturl(self):
        return self.url


class BootstrapChecks(unittest.TestCase):
    def setUp(self):
        # 운영 원본과 무관한 임시 디렉토리/합성 바이트를 사용한다.
        # 유효한 OSM 지도인지는 여기서 검사하지 않으며 실제 엔진 검증은 build.sh의 몫이다.
        self.temp = tempfile.TemporaryDirectory(prefix='ors-bootstrap-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.data = self.root/'store'
        self.config = self.root/'config/ors.json'
        self.settings = self.root/'settings.json'
        self.url = 'https://download.geofabrik.de/asia/south-korea-latest.osm.pbf'
        self.body = b'test OSM bytes'
        self.md5 = hashlib.md5(self.body, usedforsecurity=False).hexdigest()
        self.settings.write_text(json.dumps({
            'dataset_url': self.url, 'probe_coordinates': [[126.97,37.56],[126.98,37.57]],
            'http_port': 18082,
        }), encoding='utf-8')

    def respond(self, request, **kwargs):
        # 최초/완료 후의 sidecar 두 번과 본문 한 번을 각각 새 응답 객체로 돌려준다.
        # 한 번 닫힌 BytesIO를 재사용하면 실제 전송 로직과 무관한 오류가 생긴다.
        if request.full_url.endswith('.md5'):
            return Response((self.md5 + '  south-korea-latest.osm.pbf\n').encode(), request.full_url)
        return Response(self.body, request.full_url, {
            'Content-Length': str(len(self.body)), 'Last-Modified': 'test-source-modified-time',
        })

    def run_bootstrap(self):
        with patch.object(bootstrap.urllib.request, 'urlopen', side_effect=self.respond) as calls:
            bootstrap.bootstrap(self.config, self.data, self.settings)
        return calls

    def test_first_install_downloads_validates_and_generates_real_config(self):
        calls = self.run_bootstrap()
        config = load_config(self.config)
        self.assertEqual(calls.call_count, 3)
        self.assertEqual(config['data_root'], self.data)
        self.assertEqual(config['dataset_sha256'], hashlib.sha256(self.body).hexdigest())
        self.assertEqual(config['dataset_path'].read_bytes(), self.body)
        self.assertEqual(config['dataset_source_url'], self.url)
        self.assertEqual(config['source_last_modified'], 'test-source-modified-time')
        self.assertFalse(list(self.data.glob('bootstrap-*')))

    def test_repeat_deployment_preserves_config_without_network(self):
        self.run_bootstrap()
        original = self.config.read_bytes()
        with patch.object(bootstrap.urllib.request, 'urlopen') as network:
            bootstrap.bootstrap(self.config, self.data, self.settings)
            self.assertEqual(bootstrap.select_root(self.config, self.root/'ignored'), self.data)
        network.assert_not_called()
        self.assertEqual(self.config.read_bytes(), original)

    def test_invalid_existing_config_does_not_trigger_download_or_overwrite(self):
        self.config.parent.mkdir()
        self.config.write_text('{}')
        with patch.object(bootstrap.urllib.request, 'urlopen') as network:
            with self.assertRaises(ValueError):
                bootstrap.bootstrap(self.config, self.data, self.settings)
        network.assert_not_called()
        self.assertEqual(self.config.read_text(), '{}')

    def test_damaged_download_does_not_publish_config_or_source(self):
        self.md5 = '0' * 32
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.run_bootstrap()
        self.assertFalse(self.config.exists())
        self.assertFalse((self.data/'sources').exists())
        self.assertFalse(list(self.data.glob('bootstrap-*')))

    def test_upstream_update_during_download_is_rejected(self):
        # 다운로드 직전·직후의 metadata가 다르면 latest 교체 도중 받은 데이터로 간주한다.
        responses = [self.respond(type('Req', (), {'full_url': self.url + '.md5'})()),
                     self.respond(type('Req', (), {'full_url': self.url})()),
                     Response(('0'*32).encode(), self.url + '.md5')]
        with patch.object(bootstrap.urllib.request, 'urlopen', side_effect=responses):
            with self.assertRaisesRegex(ValueError, 'checksum'):
                bootstrap.bootstrap(self.config, self.data, self.settings)
        self.assertFalse(self.config.exists())

    def test_interrupted_download_does_not_leave_partial_config(self):
        with patch.object(bootstrap.urllib.request, 'urlopen', side_effect=TimeoutError('offline')):
            with self.assertRaises(TimeoutError):
                bootstrap.bootstrap(self.config, self.data, self.settings)
        self.assertFalse(self.config.exists())
        self.assertFalse(list(self.data.glob('bootstrap-*')))

    def test_incomplete_download_is_rejected(self):
        original = self.respond
        def truncated(request, **kwargs):
            response = original(request, **kwargs)
            if not request.full_url.endswith('.md5'):
                response.headers['Content-Length'] = str(len(self.body) + 1)
            return response
        with patch.object(bootstrap.urllib.request, 'urlopen', side_effect=truncated):
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                bootstrap.bootstrap(self.config, self.data, self.settings)
        self.assertFalse(self.config.exists())

    def test_existing_config_cannot_be_overwritten(self):
        # 확인 이후 다른 실행이 JSON을 만들었더라도 원래 내용을 보존해야 한다.
        self.config.parent.mkdir()
        self.config.write_text('preserve')
        with self.assertRaises(FileExistsError):
            bootstrap.create_config(self.config, {'replacement': True})
        self.assertEqual(self.config.read_text(), 'preserve')

    def test_download_deadline_does_not_publish_partial_files(self):
        with patch.object(bootstrap.time, 'monotonic', side_effect=[0,901]):
            with self.assertRaisesRegex(ValueError, 'deadline'):
                self.run_bootstrap()
        self.assertFalse(self.config.exists())
        self.assertFalse(list(self.data.glob('bootstrap-*')))

    def test_download_size_limit_stops_before_publication(self):
        with patch.object(bootstrap, 'MAX_BYTES', 5):
            with self.assertRaisesRegex(ValueError, 'size limit'):
                self.run_bootstrap()
        self.assertFalse(self.config.exists())

    def test_damaged_existing_source_is_preserved_and_rejected(self):
        source = self.data/'sources'/(hashlib.sha256(self.body).hexdigest() + '.osm.pbf')
        source.parent.mkdir(parents=True)
        source.write_bytes(b'damaged')
        with self.assertRaisesRegex(ValueError, 'damaged'):
            self.run_bootstrap()
        self.assertEqual(source.read_bytes(), b'damaged')
        self.assertFalse(self.config.exists())

    def test_changed_storage_after_lock_is_rejected_without_network(self):
        self.run_bootstrap()
        with patch.object(bootstrap.urllib.request, 'urlopen') as network:
            with self.assertRaisesRegex(ValueError, 'changed after locking'):
                bootstrap.bootstrap(self.config, self.root/'different', self.settings)
        network.assert_not_called()

    def test_invalid_policy_is_rejected_before_network(self):
        for change in ({'dataset_url': 'http://download.geofabrik.de/map.osm.pbf'},
                       {'dataset_url': 'https://example.com/map.osm.pbf'},
                       {'probe_coordinates': [[0,0],[0,0]]}, {'http_port': True}):
            with self.subTest(change=change):
                policy = json.loads(self.settings.read_text())
                policy.update(change)
                invalid = self.root/'invalid.json'
                invalid.write_text(json.dumps(policy))
                with patch.object(bootstrap.urllib.request, 'urlopen') as network:
                    with self.assertRaises(ValueError):
                        bootstrap.bootstrap(self.config, self.data, invalid)
                network.assert_not_called()

    def test_checkout_paths_are_rejected_before_network(self):
        with patch.object(bootstrap.urllib.request, 'urlopen') as network:
            with self.assertRaises(ValueError):
                bootstrap.bootstrap(bootstrap.ROOT/'ors.json', self.data, self.settings)
            with self.assertRaises(ValueError):
                bootstrap.bootstrap(self.config, bootstrap.ROOT/'ors-data', self.settings)
        network.assert_not_called()


if __name__ == '__main__':
    unittest.main(verbosity=2)
