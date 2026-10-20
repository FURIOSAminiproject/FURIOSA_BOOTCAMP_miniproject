"""Offline tests. No AWS, Docker daemon or certificate authority is contacted."""
from contextlib import redirect_stdout
import hashlib
import io
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import revoke_ip_certificates as manager

OLD_IP = "32.236.200.229"
NEW_IP = "8.8.8.8"  # Fixture values only, never contacted.


class Metadata:
    def __init__(self, *snapshots):
        self.snapshots = list(snapshots or [frozenset([NEW_IP])])

    def public_ipv4s(self):
        if len(self.snapshots) > 1:
            return self.snapshots.pop(0)
        return self.snapshots[0]


class RevocationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.lineage = self.root / "live" / OLD_IP
        self.lineage.mkdir(parents=True)
        (self.root / "renewal").mkdir()
        self.leaf = self.lineage / "cert.pem"
        self.leaf.write_bytes(b"offline fake certificate\n")
        self.renewal = self.root / "renewal" / (OLD_IP + ".conf")
        self.renewal.write_text(
            "# Keep this comment\nversion = 5.8.0\n[renewalparams]\n"
            "server = " + manager.ACME_SERVER + "\naccount = " + "a" * 32 +
            "\nautorenew = True\nauthenticator = webroot\n[[webroot_map]]\n" +
            OLD_IP + " = /var/www/certbot\n", encoding="utf-8")
        self.san = "IP Address:" + OLD_IP
        self.expiration = "Jan  1 00:00:00 2040 GMT"
        self.calls = []
        self.docker_result = subprocess.CompletedProcess([], 0, "revoked", "")
        self.addCleanup(patch.stopall)
        patch.object(manager, "run", side_effect=self.run_command).start()

    def run_command(self, command, timeout=15):
        self.calls.append(command)
        if command[0] == "openssl":
            output = ("X509v3 Subject Alternative Name:\n    " + self.san + "\n"
                      if "-ext" in command else "notAfter=" + self.expiration + "\n")
            return subprocess.CompletedProcess(command, 0, output, "")
        self.assertEqual(command[:3], ["docker", "run", "--rm"])
        self.assertTrue((self.lineage / manager.DISABLED_MARKER).exists())
        self.assertIn("autorenew = False", self.renewal.read_text())
        self.assertNotIn("--email", command)
        self.assertIn("--no-delete-after-revoke", command)
        self.assertIn("cessationofoperation", command)
        if isinstance(self.docker_result, Exception):
            raise self.docker_result
        return self.docker_result

    def reconcile(self, apply=False, metadata=None, retire=False):
        with redirect_stdout(io.StringIO()) as output:
            manager.reconcile(self.root, [OLD_IP], metadata or Metadata(), apply, retire)
        return output.getvalue()

    def docker_calls(self):
        return [call for call in self.calls if call[0] == "docker"]

    def test_default_is_read_only(self):
        before = self.renewal.read_bytes()
        self.assertIn("WOULD REVOKE", self.reconcile())
        self.assertEqual(self.docker_calls(), [])
        self.assertEqual(self.renewal.read_bytes(), before)
        self.assertFalse((self.lineage / manager.DISABLED_MARKER).exists())

    def test_current_and_secondary_ips_are_kept(self):
        self.assertIn("KEEP", self.reconcile(True, Metadata(frozenset([NEW_IP, OLD_IP]))))
        self.assertEqual(self.docker_calls(), [])

    def test_explicit_retirement_of_current_ip(self):
        self.assertIn("REVOKED", self.reconcile(True, Metadata(frozenset([OLD_IP])), True))
        self.assertEqual(len(self.docker_calls()), 1)

    def test_apply_disables_renewal_before_request_and_records_success(self):
        self.assertIn("REVOKED", self.reconcile(True))
        digest = hashlib.sha256(self.leaf.read_bytes()).hexdigest()
        self.assertEqual((self.lineage / manager.REVOKED_MARKER).read_text().strip(), digest)
        text = self.renewal.read_text()
        self.assertIn("# Keep this comment", text)
        self.assertIn("[[webroot_map]]", text)
        self.assertEqual(text.count("autorenew = False"), 1)
        self.assertTrue(self.leaf.exists())
        self.assertIn("already recorded", self.reconcile(True))
        self.assertEqual(len(self.docker_calls()), 1)

    def test_failed_request_retains_disabled_state_and_can_retry(self):
        self.docker_result = subprocess.CompletedProcess([], 1, "", "network unavailable")
        with self.assertRaises(manager.SafetyError):
            self.reconcile(True)
        self.assertTrue((self.lineage / manager.DISABLED_MARKER).exists())
        self.assertFalse((self.lineage / manager.REVOKED_MARKER).exists())
        self.docker_result = subprocess.CompletedProcess([], 0, "", "")
        self.assertIn("REVOKED", self.reconcile(True))

    def test_timeout_is_not_a_confirmed_revocation(self):
        self.docker_result = subprocess.TimeoutExpired("docker", 180)
        with self.assertRaises(subprocess.TimeoutExpired):
            self.reconcile(True)
        self.assertTrue((self.lineage / manager.DISABLED_MARKER).exists())
        self.assertFalse((self.lineage / manager.REVOKED_MARKER).exists())

    def test_explicit_acme_already_revoked_result_is_idempotent(self):
        self.docker_result = subprocess.CompletedProcess(
            [], 1, "", "urn:ietf:params:acme:error:alreadyRevoked :: already revoked")
        self.assertIn("REVOKED", self.reconcile(True))

    def test_dns_mixed_multiple_ipv6_and_private_sans_are_skipped(self):
        for san in ["DNS:example.com", "IP Address:" + OLD_IP + ", DNS:example.com",
                    "IP Address:" + OLD_IP + ", IP Address:" + NEW_IP,
                    "IP Address:2001:4860:4860::8888", "IP Address:10.0.0.1"]:
            with self.subTest(san=san):
                self.san = san
                self.assertIn("SKIP", self.reconcile(True))
        self.assertEqual(self.docker_calls(), [])

    def test_expired_certificate_is_skipped(self):
        self.expiration = "Jan  1 00:00:00 2020 GMT"
        self.assertIn("already expired", self.reconcile(True))
        self.assertEqual(self.docker_calls(), [])

    def test_metadata_failure_never_writes_or_revokes(self):
        metadata = Metadata()
        metadata.public_ipv4s = lambda: (_ for _ in ()).throw(manager.SafetyError("unavailable"))
        with self.assertRaises(manager.SafetyError):
            self.reconcile(True, metadata)
        self.assertFalse((self.lineage / manager.DISABLED_MARKER).exists())
        self.assertEqual(self.docker_calls(), [])

    def test_ip_change_during_operation_aborts(self):
        snapshots = Metadata(frozenset([NEW_IP]), frozenset([OLD_IP]))
        with self.assertRaises(manager.SafetyError):
            self.reconcile(True, snapshots)
        self.assertFalse((self.lineage / manager.DISABLED_MARKER).exists())

    def test_certificate_change_during_operation_aborts(self):
        metadata = Metadata()
        calls = []
        def addresses():
            calls.append(1)
            if len(calls) == 2:
                self.leaf.write_bytes(b"a replacement certificate")
            return frozenset([NEW_IP])
        metadata.public_ipv4s = addresses
        with self.assertRaises(manager.SafetyError):
            self.reconcile(True, metadata)
        self.assertEqual(self.docker_calls(), [])

    def test_invalid_name_and_wrong_ca_fail_before_metadata(self):
        for name in ["../other", "..", "/etc/passwd", "-option"]:
            with self.subTest(name=name), self.assertRaises(manager.SafetyError):
                manager.inspect_certificate(self.root, name)
        self.renewal.write_text(self.renewal.read_text().replace(manager.ACME_SERVER, "https://other.invalid"))
        with self.assertRaises(manager.SafetyError):
            self.reconcile(True)
        self.assertEqual(self.docker_calls(), [])

    def test_revocation_uses_stable_public_certificate_snapshot(self):
        certificate = manager.inspect_certificate(self.root, OLD_IP)
        # The low-level runner verifies state has already been staged.
        manager.write_marker(self.lineage / manager.DISABLED_MARKER, certificate.digest)
        manager.disable_autorenew(certificate)
        manager.revoke(self.root, certificate)
        expected = "/etc/letsencrypt/.travel-ip-revoke/" + certificate.digest + ".pem"
        self.assertIn(expected, self.docker_calls()[0])
        snapshot = self.root / ".travel-ip-revoke" / (certificate.digest + ".pem")
        self.leaf.write_bytes(b"a later replacement certificate")
        self.assertEqual(hashlib.sha256(snapshot.read_bytes()).hexdigest(), certificate.digest)

    def test_changed_renewal_settings_abort_before_ca_request(self):
        metadata = Metadata()
        calls = []
        def addresses():
            calls.append(1)
            if len(calls) == 2:
                self.renewal.write_text(self.renewal.read_text() + "\n# concurrent change\n")
            return frozenset([NEW_IP])
        metadata.public_ipv4s = addresses
        with self.assertRaises(manager.SafetyError):
            self.reconcile(True, metadata)
        self.assertEqual(self.docker_calls(), [])


class MetadataTests(unittest.TestCase):
    def test_imdsv2_enumerates_all_interfaces(self):
        metadata = manager.InstanceMetadata()
        values = ["token", "aa:bb:cc:dd:ee:ff/\n11:22:33:44:55:66/", OLD_IP, NEW_IP]
        with patch.object(metadata, "_read", side_effect=values) as read:
            self.assertEqual(metadata.public_ipv4s(), frozenset([OLD_IP, NEW_IP]))
        self.assertEqual(read.call_args_list[0].args[0].get_method(), "PUT")
        self.assertEqual(read.call_args_list[1].args[0].get_header("X-aws-ec2-metadata-token"), "token")

    def test_empty_invalid_private_or_unavailable_metadata_fails(self):
        mac = "aa:bb:cc:dd:ee:ff/"
        missing = HTTPError("http://169.254.169.254/", 404, "not found", {}, None)
        self.addCleanup(missing.close)
        for values in [["", mac], ["token", "invalid"], ["token", mac, "10.0.0.1"],
                       ["token", mac, ""], ["token", mac, missing]]:
            with self.subTest(values=values):
                metadata = manager.InstanceMetadata()
                with patch.object(metadata, "_read", side_effect=values), self.assertRaises(manager.SafetyError):
                    metadata.public_ipv4s()

    def test_redirects_are_not_followed(self):
        self.assertIsNone(manager.NoRedirect().redirect_request(None, None, 302, "", {}, "http://example.com"))


class RealOpenSSLTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("openssl"), "OpenSSL unavailable")
    def test_real_ipv4_san_and_expiration_parsing(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            lineage = root / "live" / "fixture"
            lineage.mkdir(parents=True)
            (root / "renewal").mkdir()
            (root / "renewal" / "fixture.conf").write_text(
                "[renewalparams]\nserver = " + manager.ACME_SERVER + "\naccount = " + "a" * 32 + "\n")
            result = subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
                            "-config", os.devnull,
                            "-subj", "/CN=offline-test", "-addext", "subjectAltName=IP:" + OLD_IP,
                            "-keyout", str(root / "key.pem"), "-out", str(lineage / "cert.pem")],
                           capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr)
            cert = manager.inspect_certificate(root, "fixture")
            self.assertEqual(cert.address, OLD_IP)
            self.assertGreater(cert.expires, manager.time.time())


class EntrypointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.shell = "C:/Program Files/Git/bin/bash.exe" if os.name == "nt" else "/bin/sh"
        if not Path(cls.shell).exists():
            raise unittest.SkipTest("POSIX shell unavailable")
        cls.frontend = Path(__file__).resolve().parents[3] / "FrontEnd"

    def fixture(self, files, blocked=None, invalid_marker=False, nginx_exit=0, replacement=False):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            certs = root / "live"
            certs.mkdir()
            templates = root / "templates"
            templates.mkdir()
            conf = root / "conf"
            conf.mkdir()
            binary = root / "bin"
            binary.mkdir()
            (binary / "nginx").write_bytes(("#!/bin/sh\necho MOCK_NGINX\nexit " + str(nginx_exit) + "\n").encode())
            (binary / "nginx").chmod(0o755)
            for file in files:
                target = certs / file
                target.parent.mkdir(exist_ok=True)
                target.write_bytes(b"fixture\n")
            if blocked:
                marker = certs / blocked / manager.DISABLED_MARKER
                value = "broken" if invalid_marker else hashlib.sha256(b"fixture\n").hexdigest()
                marker.write_text(value + "\n")
                if replacement:
                    (certs / blocked / "cert.pem").write_bytes(b"replacement leaf\n")
            for name in ("nginx_http.conf", "nginx_ssl.conf"):
                shutil.copyfile(self.frontend / name, templates / name)
            source = (self.frontend / "docker-entrypoint.sh").read_text(encoding="utf-8")
            source = source.replace("/etc/letsencrypt/live", certs.as_posix())
            source = source.replace("/etc/nginx/templates", templates.as_posix())
            source = source.replace("/etc/nginx/conf.d", conf.as_posix())
            shell_bin = binary.as_posix()
            if os.name == "nt":
                shell_bin = "/" + shell_bin[0].lower() + shell_bin[2:]
            source = "export PATH=" + shlex.quote(shell_bin) + ':"$PATH"\n' + source
            result = subprocess.run([self.shell, "-s", "--", "sh", "-c", "echo FRONTEND_STARTED"],
                                    input=source, text=True, capture_output=True, timeout=15)
            self.assertIn("MOCK_NGINX", result.stdout, result.stderr)
            return result, (conf / "default.conf").read_text(encoding="utf-8")

    def test_http_without_certificates(self):
        result, config = self.fixture([])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("listen 443 ssl", config)

    def test_valid_pair_uses_https(self):
        result, config = self.fixture(["a/fullchain.pem", "a/privkey.pem"])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("listen 443 ssl", config)

    def test_different_lineage_cert_and_key_are_never_combined(self):
        _, config = self.fixture(["a/fullchain.pem", "b/privkey.pem"])
        self.assertNotIn("listen 443 ssl", config)

    def test_disabled_leaf_and_invalid_state_use_http(self):
        for invalid in [False, True]:
            with self.subTest(invalid=invalid):
                _, config = self.fixture(["a/fullchain.pem", "a/privkey.pem", "a/cert.pem"], "a", invalid)
                self.assertNotIn("listen 443 ssl", config)

    def test_unrelated_certificate_can_still_be_selected(self):
        _, config = self.fixture(["a/fullchain.pem", "a/privkey.pem", "a/cert.pem",
                                  "b/fullchain.pem", "b/privkey.pem"], "a")
        self.assertIn("/b/fullchain.pem", config)
        self.assertNotIn("/a/fullchain.pem", config)

    def test_replacement_leaf_does_not_match_old_marker(self):
        _, config = self.fixture(["a/fullchain.pem", "a/privkey.pem", "a/cert.pem"],
                                 "a", replacement=True)
        self.assertIn("listen 443 ssl", config)

    def test_marker_without_leaf_is_not_selectable(self):
        _, config = self.fixture(["a/fullchain.pem", "a/privkey.pem"], "a")
        self.assertNotIn("listen 443 ssl", config)

    def test_nginx_validation_failure_never_starts_server(self):
        result, _ = self.fixture([], nginx_exit=1)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("FRONTEND_STARTED", result.stdout)


if __name__ == "__main__":
    unittest.main()
