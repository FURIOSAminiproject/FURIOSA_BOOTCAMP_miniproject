"""실제 호스트 사양을 바꾸지 않고 작은 공유 서버와 메모리/CPU 예산 차단을 검증한다."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preflight import GIB, MIB, check, memory_size, read_memory


class ResourceChecks(unittest.TestCase):
    def host(self, total=8, available=5):
        return {"MemTotal": total * GIB, "MemAvailable": available * GIB}

    def test_default_shared_host_budget(self):
        self.assertEqual(check(self.host(), 8 * GIB, 2, {}),
                         {"memory_limit": 3 * GIB, "cpu_limit": 0.5})

    def test_t4g_small_rejected_even_with_a_reduced_heap(self):
        for settings in ({}, {"ORS_MEMORY_LIMIT": "768m", "ORS_JVM_XMX": "256m"}):
            with self.subTest(settings=settings):
                with self.assertRaisesRegex(ValueError, 'host RAM'):
                    check(self.host(2, 1), 2 * GIB, 2, settings)

    def test_low_available_memory_preserves_database_headroom(self):
        with self.assertRaisesRegex(ValueError, 'available RAM'):
            check(self.host(8, 2), 8 * GIB, 2, {})

    def test_docker_memory_is_also_checked(self):
        with self.assertRaisesRegex(ValueError, 'host RAM'):
            check(self.host(), 2 * GIB, 2, {})

    def test_invalid_heap_and_cpu_budgets(self):
        for settings in ({"ORS_JVM_XMX": "3g"}, {"ORS_JVM_XMS": "3g"},
                         {"ORS_CPUS": "2"}, {"ORS_CPUS": "0"},
                         {"ORS_CPUS": "nan"}, {"ORS_CPUS": "inf"}):
            with self.subTest(settings=settings):
                with self.assertRaises(ValueError):
                    check(self.host(), 8 * GIB, 2, settings)

    def test_larger_container_requires_more_host_memory(self):
        with self.assertRaisesRegex(ValueError, 'host RAM'):
            check(self.host(), 8 * GIB, 2, {"ORS_MEMORY_LIMIT": "7g"})

    def test_memory_unit_parsing_and_invalid_values(self):
        self.assertEqual(memory_size('3g'), 3 * GIB)
        self.assertEqual(memory_size('512MB'), 512 * MIB)
        self.assertEqual(memory_size('0.5g'), 512 * MIB)
        for value in ('0', '-1g', 'unlimited', 'nan', '1g\nextra'):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    memory_size(value)

    def test_proc_meminfo_and_missing_metrics(self):
        with tempfile.TemporaryDirectory(prefix='ors-memory-test-') as directory:
            path = Path(directory)/'meminfo'
            path.write_text('MemTotal: 8388608 kB\nMemAvailable: 5242880 kB\nSwapFree: 99999999 kB\n')
            self.assertEqual(read_memory(path), self.host())
            path.write_text('MemTotal: 8388608 kB\n')
            with self.assertRaisesRegex(ValueError, 'headroom'):
                read_memory(path)


if __name__ == '__main__':
    unittest.main(verbosity=2)
