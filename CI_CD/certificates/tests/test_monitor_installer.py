"""Installer control flow with every system-mutating command replaced by a stub."""
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


class InstallerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.shell = "C:/Program Files/Git/bin/bash.exe" if os.name == "nt" else "/bin/bash"
        if not Path(cls.shell).exists():
            raise unittest.SkipTest("Bash unavailable")
        cls.source = Path(__file__).resolve().parents[1]

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="furiosa-monitor-install-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.script = self.root / "install_monitor.sh"
        shell_bin = self.bin.as_posix()
        if os.name == "nt":
            shell_bin = "/" + shell_bin[0].lower() + shell_bin[2:]
        self.script.write_bytes(("export PATH=" + shlex.quote(shell_bin) + ':"$PATH"\n' +
                                 (self.source / "install_monitor.sh").read_text(encoding="utf-8")).encode("utf-8"))
        self.log = self.root / "calls"
        bodies = {
            "id": "echo 0\n",
            "install": 'printf "install %s\\n" "$*" >> "$CALL_LOG"\n',
            "openssl": "exit 0\n",
            "docker": "exit 0\n",
            "systemctl": 'printf "systemctl %s\\n" "$*" >> "$CALL_LOG"\n',
            "flock": 'if [ "$1" = "-n" ]; then exit "$MOCK_LOCK_EXIT"; fi\n',
            "python3": '''printf "python3 %s\\n" "$*" >> "$CALL_LOG"
if [ "$1" = "-" ]; then printf "%s\\n" "$FAKE_CERT_ROOT"; exit 0; fi
exit "$MOCK_CHECK_EXIT"
''',
        }
        for name, body in bodies.items():
            path = self.bin / name
            path.write_bytes(("#!/usr/bin/env bash\n" + body).encode("utf-8"))
            path.chmod(0o755)
        self.env = dict(os.environ)
        self.env.update(PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
                        CALL_LOG=self.log.as_posix(), FAKE_CERT_ROOT=self.root.as_posix(),
                        MOCK_LOCK_EXIT="0", MOCK_CHECK_EXIT="0")

    def run_installer(self):
        result = subprocess.run([self.shell, self.script.as_posix()], env=self.env,
                                capture_output=True, text=True, encoding="utf-8", timeout=20)
        self.assertTrue(self.log.exists(), result.stderr)
        return result, self.log.read_text(encoding="utf-8")

    def test_installer_validates_before_enabling_and_uses_stable_paths(self):
        result, calls = self.run_installer()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("/opt/travel-certificates/monitor_certificates.py", calls)
        self.assertIn("systemctl enable --now travel-certificate-monitor.timer", calls)
        self.assertNotIn("--apply", calls)  # 설치 전 검사 자체는 읽기 전용이다.
        self.assertLess(calls.index("python3"), calls.index("systemctl enable"))

    def test_failed_preflight_never_installs_runtime_or_enables_timer(self):
        self.env["MOCK_CHECK_EXIT"] = "1"
        result, calls = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("/opt/travel-certificates/monitor_certificates.py", calls)
        self.assertNotIn("systemctl enable", calls)

    def test_existing_revocation_lock_prevents_runtime_overwrite(self):
        self.env["MOCK_LOCK_EXIT"] = "1"
        result, calls = self.run_installer()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("/opt/travel-certificates/monitor_certificates.py", calls)
        self.assertNotIn("systemctl enable", calls)

    def test_units_run_installed_code_every_five_minutes(self):
        service = (self.source / "systemd/travel-certificate-monitor.service").read_text()
        timer = (self.source / "systemd/travel-certificate-monitor.timer").read_text()
        self.assertIn("/opt/travel-certificates/monitor_certificates.py", service)
        self.assertIn("--apply", service)
        self.assertIn("OnUnitInactiveSec=5min", timer)
        self.assertIn("Unit=travel-certificate-monitor.service", timer)


if __name__ == "__main__":
    unittest.main()
