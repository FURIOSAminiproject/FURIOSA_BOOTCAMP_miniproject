"""Offline monitor tests: metadata, DNS, Docker, Nginx and CA calls are mocked."""
from contextlib import redirect_stderr, redirect_stdout
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import certificate_dns as dns
import monitor_certificates as monitor
import revoke_ip_certificates as manager


DOMAIN = "roadfriendtrip.freeddns.org"
OLD_IP = "32.236.200.229"
NEW_IP = "8.8.8.8"  # Fixture only: never contacted.


class Metadata:
    def __init__(self, addresses):
        self.addresses = frozenset(addresses)
        self.error = False
        self.calls = 0
        self.on_second = None

    def public_ipv4s(self):
        self.calls += 1
        if self.on_second and self.calls == 2:
            self.on_second()
        if self.error:
            raise manager.SafetyError("metadata unavailable")
        return self.addresses


class Resolver:
    def __init__(self, addresses):
        self.value = dns.DNSResult(frozenset(addresses))
        self.error = False
        self.on_second = None
        self.calls = 0
        self.names = []

    def lookup(self, name):
        self.calls += 1
        self.names.append(name)
        if self.on_second and self.calls == 2:
            return self.on_second()
        if self.error:
            raise manager.SafetyError("DNS temporarily unavailable")
        return self.value


class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / "live").mkdir()
        (self.root / "renewal").mkdir()
        self.env = self.root / "production.env"
        self.env.write_text("DB_PASSWORD=never-print-this\nFRONTEND_URL=https://" + DOMAIN + "\n", encoding="utf-8")
        self.policy = monitor.Policy(self.root, self.env)
        self.metadata = Metadata([OLD_IP])
        self.resolver = Resolver([OLD_IP])
        self.sans = {}
        self.calls = []
        self.ca_result = subprocess.CompletedProcess([], 0, "revoked", "")
        self.restart_result = 0
        self.marker_support = 0
        self.add_cert(OLD_IP, "IP Address:" + OLD_IP)
        self.add_cert(DOMAIN, "DNS:" + DOMAIN)
        self.patcher = patch.object(manager, "run", side_effect=self.command)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def add_cert(self, name, san):
        self.sans[name] = san
        lineage = self.root / "live" / name
        lineage.mkdir()
        (lineage / "cert.pem").write_text("fixture leaf " + name + "\n", encoding="ascii")
        (self.root / "renewal" / (name + ".conf")).write_text(
            "# keep comment\n[renewalparams]\nserver = " + manager.ACME_SERVER +
            "\naccount = " + "a" * 32 + "\nautorenew = True\n[[webroot_map]]\n" +
            name + " = /var/www/certbot\n", encoding="utf-8")

    def command(self, command, timeout=15):
        self.calls.append(command)
        if command[0] == "openssl":
            name = Path(command[command.index("-in") + 1]).parent.name
            output = ("X509v3 Subject Alternative Name:\n    " + self.sans[name] + "\n"
                      if "-ext" in command else "notAfter=Jan  1 00:00:00 2040 GMT\n")
            return subprocess.CompletedProcess(command, 0, output, "")
        self.assertEqual(command[0], "docker")
        if command[1] == "restart":
            return subprocess.CompletedProcess(command, self.restart_result, "", "")
        if command[1] == "exec":
            return subprocess.CompletedProcess(command, self.marker_support if "sh" in command else 0, "", "")
        self.assertEqual(command[:3], ["docker", "run", "--rm"])
        self.assertIn("revoke", command)
        self.assertIn("--no-delete-after-revoke", command)
        snapshot = command[command.index("--cert-path") + 1].replace("/etc/letsencrypt/", "")
        self.assertTrue((self.root / snapshot).exists())
        self.assertNotIn("--email", command)
        if isinstance(self.ca_result, Exception):
            raise self.ca_result
        return self.ca_result

    def poll(self, now=1000, apply=True):
        with redirect_stdout(io.StringIO()) as output, redirect_stderr(io.StringIO()) as errors:
            code = monitor.monitor(self.policy, self.metadata, self.resolver, apply, now)
        self.assertNotIn("never-print-this", output.getvalue() + errors.getvalue())
        return code, output.getvalue(), errors.getvalue()

    def finish_window(self):
        self.poll(1000)
        self.poll(1300)
        return self.poll(1900)

    def ca_calls(self):
        return [call for call in self.calls if call[:3] == ["docker", "run", "--rm"]]

    def restarts(self):
        return [call for call in self.calls if call[:2] == ["docker", "restart"]]

    def test_default_is_read_only_and_discovers_both_certificate_types(self):
        self.metadata.addresses = frozenset([NEW_IP])
        code, output, _ = self.poll(apply=False)
        self.assertEqual(code, 0)
        self.assertIn("PENDING " + OLD_IP, output)
        self.assertIn("PENDING " + DOMAIN, output)
        self.assertFalse((self.root / monitor.STATE_FILE).exists())
        self.assertEqual(self.ca_calls() + self.restarts(), [])

    def test_current_ip_and_domain_are_kept(self):
        code, output, _ = self.finish_window()
        self.assertEqual(code, 0)
        self.assertIn("KEEP " + DOMAIN, output)
        self.assertEqual(self.ca_calls() + self.restarts(), [])

    def test_ip_change_revokes_only_ip_certificate_when_domain_follows_new_ip(self):
        self.metadata.addresses = frozenset([NEW_IP])
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.poll(1300)
        self.assertEqual(self.ca_calls(), [])
        code, output, _ = self.poll(1900)
        self.assertEqual(code, 0)
        self.assertIn("REVOKED " + OLD_IP, output)
        self.assertIn("KEEP " + DOMAIN, output)
        self.assertEqual(len(self.ca_calls()), 1)
        self.assertEqual(len(self.restarts()), 1)
        restart_index = self.calls.index(self.restarts()[0])
        self.assertLess(restart_index, self.calls.index(self.ca_calls()[0]))
        self.assertTrue((self.root / "live" / OLD_IP / manager.REVOKED_MARKER).exists())
        renewal = (self.root / "renewal" / (OLD_IP + ".conf")).read_text()
        self.assertIn("autorenew = False", renewal)
        self.assertIn("# keep comment", renewal)
        self.assertIn("[[webroot_map]]", renewal)

    def test_dns_points_elsewhere_after_grace_revokes_domain(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        code, output, _ = self.finish_window()
        self.assertEqual(code, 0)
        self.assertIn("REVOKED " + DOMAIN, output)
        self.assertEqual(len(self.ca_calls()), 1)

    def test_confirmed_dns_absence_can_revoke_after_grace(self):
        self.resolver.value = dns.DNSResult(frozenset())
        code, output, _ = self.finish_window()
        self.assertEqual(code, 0)
        self.assertIn("DNS_NO_ADDRESS", output)
        self.assertEqual(len(self.ca_calls()), 1)

    def test_configured_domain_change_requires_new_domain_to_point_here(self):
        self.env.write_text("FRONTEND_URL=https://new.example.test\n", encoding="utf-8")
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        code, _, errors = self.finish_window()
        self.assertEqual(code, 1)
        self.assertIn("New FRONTEND_URL", errors)
        self.assertEqual(self.ca_calls(), [])
        self.resolver.value = dns.DNSResult(frozenset([OLD_IP]))
        for now in (2200, 2500, 3100):
            code, output, _ = self.poll(now)
        self.assertEqual(code, 0)
        self.assertIn("DOMAIN_RETIRED", output)
        self.assertEqual(len(self.ca_calls()), 1)
        self.assertIn(DOMAIN, self.resolver.names)
        self.assertIn("new.example.test", self.resolver.names)

    def test_dns_error_breaks_confirmation_chain(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.resolver.error = True
        self.assertEqual(self.poll(1300)[0], 1)
        self.assertEqual(monitor.load_state(self.root)["pending"], {})
        self.resolver.error = False
        self.poll(1900)
        self.assertEqual(self.ca_calls(), [])
        self.assertEqual(monitor.load_state(self.root)["pending"][DOMAIN]["count"], 1)

    def test_metadata_error_clears_observations_without_revoking(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll()
        self.metadata.error = True
        with self.assertRaises(manager.SafetyError):
            self.poll(1300)
        self.assertEqual(monitor.load_state(self.root)["pending"], {})
        self.assertEqual(self.ca_calls(), [])

    def test_recovery_before_grace_clears_pending(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.resolver.value = dns.DNSResult(frozenset([OLD_IP]))
        self.poll(1300)
        self.assertEqual(monitor.load_state(self.root)["pending"], {})
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1900)
        self.assertEqual(self.ca_calls(), [])

    def test_no_public_ip_does_not_retire_all_certificates(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.metadata.addresses = frozenset()
        with self.assertRaises(manager.SafetyError):
            self.poll(1900)
        self.assertEqual(monitor.load_state(self.root)["pending"], {})
        self.assertEqual(self.ca_calls(), [])

    def test_long_gap_and_clock_rollback_restart_confirmation(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        for now in (1000, 3000, 2900):
            self.poll(now)
            self.assertEqual(monitor.load_state(self.root)["pending"][DOMAIN]["count"], 1)
        self.assertEqual(self.ca_calls(), [])

    def test_dns_ttl_can_extend_grace(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]), ttl=3600)
        for now in range(1000, 4600, 300):
            self.poll(now)
            self.assertEqual(self.ca_calls(), [])
        self.poll(4600)
        self.assertEqual(len(self.ca_calls()), 1)

    def test_failed_ca_request_keeps_block_and_retries_even_if_dns_recovers(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.ca_result = subprocess.CompletedProcess([], 1, "", "temporary network failure")
        self.assertEqual(self.finish_window()[0], 1)
        lineage = self.root / "live" / DOMAIN
        self.assertTrue((lineage / manager.DISABLED_MARKER).exists())
        self.assertFalse((lineage / manager.REVOKED_MARKER).exists())
        self.ca_result = subprocess.CompletedProcess([], 0, "revoked", "")
        self.resolver.value = dns.DNSResult(frozenset([OLD_IP]))
        self.assertEqual(self.poll(2200)[0], 0)
        self.assertEqual(len(self.ca_calls()), 2)
        self.assertEqual(len(self.restarts()), 1)
        self.assertTrue((lineage / manager.REVOKED_MARKER).exists())
        self.poll(2500)
        self.assertEqual(len(self.ca_calls()), 2)

    def test_ca_timeout_is_not_recorded_as_success(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.ca_result = subprocess.TimeoutExpired("docker", 180)
        self.assertEqual(self.finish_window()[0], 1)
        lineage = self.root / "live" / DOMAIN
        self.assertTrue((lineage / manager.DISABLED_MARKER).exists())
        self.assertFalse((lineage / manager.REVOKED_MARKER).exists())
        self.assertEqual(len(self.restarts()), 1)

    def test_renewal_write_failure_never_sends_ca_request(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        with patch.object(manager, "disable_autorenew", side_effect=OSError("read-only renewal")):
            self.assertEqual(self.finish_window()[0], 1)
        lineage = self.root / "live" / DOMAIN
        self.assertTrue((lineage / manager.DISABLED_MARKER).exists())
        self.assertFalse((lineage / manager.REVOKED_MARKER).exists())
        self.assertEqual(self.ca_calls(), [])
        self.assertEqual(len(self.restarts()), 1)
        self.assertEqual(self.poll(2200)[0], 0)
        self.assertEqual(len(self.ca_calls()), 1)

    def test_identity_change_during_final_check_prevents_revocation(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.poll(1300)
        with patch.object(monitor, "current_domain", side_effect=[DOMAIN, "new.example.test"]):
            self.assertEqual(self.poll(1900)[0], 1)
        self.assertEqual(self.ca_calls(), [])
        self.assertFalse((self.root / "live" / DOMAIN / manager.DISABLED_MARKER).exists())

    def test_ip_change_during_final_check_prevents_revocation(self):
        self.metadata.addresses = frozenset([NEW_IP])
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.poll(1300)
        self.metadata.calls = 0
        self.metadata.on_second = lambda: setattr(self.metadata, "addresses", frozenset([OLD_IP]))
        self.assertEqual(self.poll(1900)[0], 1)
        self.assertEqual(self.ca_calls(), [])
        self.assertFalse((self.root / "live" / OLD_IP / manager.DISABLED_MARKER).exists())

    def test_ca_already_revoked_is_recorded_as_success(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.ca_result = subprocess.CompletedProcess([], 1, "", "urn:ietf:params:acme:error:alreadyRevoked")
        self.assertEqual(self.finish_window()[0], 0)
        self.assertTrue((self.root / "live" / DOMAIN / manager.REVOKED_MARKER).exists())

    def test_removed_disabled_marker_is_restored_and_frontend_refreshed(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.finish_window()
        (self.root / "live" / DOMAIN / manager.DISABLED_MARKER).unlink()
        self.poll(2200)
        self.assertEqual(len(self.ca_calls()), 1)
        self.assertEqual(len(self.restarts()), 2)
        self.assertTrue((self.root / "live" / DOMAIN / manager.DISABLED_MARKER).exists())

    def test_restart_failure_does_not_prevent_ca_request_and_is_retried_next_poll(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.restart_result = 1
        self.assertEqual(self.finish_window()[0], 1)
        self.assertEqual(len(self.ca_calls()), 1)
        self.assertEqual(len(self.restarts()), 1)
        self.restart_result = 0
        self.assertEqual(self.poll(2200)[0], 0)
        self.assertEqual(len(self.ca_calls()), 1)
        self.assertEqual(len(self.restarts()), 2)

    def test_old_frontend_is_rejected_before_marking_or_revoking(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.marker_support = 1
        self.assertEqual(self.finish_window()[0], 1)
        self.assertEqual(self.ca_calls(), [])
        self.assertFalse((self.root / "live" / DOMAIN / manager.DISABLED_MARKER).exists())

    def test_dns_changed_on_final_check_prevents_revocation(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.poll(1300)
        self.resolver.calls = 0
        self.resolver.on_second = lambda: dns.DNSResult(frozenset([OLD_IP]))
        self.assertEqual(self.poll(1900)[0], 1)
        self.assertEqual(self.ca_calls(), [])

    def test_leaf_changed_during_final_ip_check_prevents_changes(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.poll(1000)
        self.poll(1300)
        self.metadata.calls = 0
        self.metadata.on_second = lambda: (self.root / "live" / DOMAIN / "cert.pem").write_text("renewed\n")
        self.assertEqual(self.poll(1900)[0], 1)
        self.assertEqual(self.ca_calls(), [])
        self.assertFalse((self.root / "live" / DOMAIN / manager.DISABLED_MARKER).exists())

    def test_ipv6_and_non_direct_dns_do_not_trigger_false_revocation(self):
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]), has_ipv6=True)
        self.assertEqual(self.finish_window()[0], 1)
        self.resolver.value = dns.DNSResult(frozenset([NEW_IP]))
        self.policy = monitor.Policy(self.root, self.env, direct_dns=False)
        self.assertEqual(self.finish_window()[0], 1)
        self.assertEqual(self.ca_calls(), [])

    def test_multi_san_and_wildcard_are_skipped(self):
        self.add_cert("mixed", "DNS:" + DOMAIN + ", DNS:other.example.test")
        self.add_cert("wildcard", "DNS:*.example.test")
        code, output, _ = self.poll()
        self.assertEqual(code, 0)
        self.assertIn("SKIP mixed", output)
        self.assertIn("SKIP wildcard", output)
        self.assertEqual(self.ca_calls(), [])

    def test_corrupt_state_and_invalid_identity_abort(self):
        state = self.root / monitor.STATE_FILE
        state.write_text('{"version":0}', encoding="utf-8")
        with self.assertRaises(manager.SafetyError):
            self.poll()
        state.unlink()
        self.env.write_text("FRONTEND_URL=https://32.236.200.229\n", encoding="utf-8")
        with self.assertRaises(manager.SafetyError):
            self.poll()
        self.assertEqual(self.ca_calls(), [])


class IdentityTests(unittest.TestCase):
    def test_quotes_comments_duplicates_and_no_shell_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "identity.env"
            path.write_text('FRONTEND_URL=https://old.example.test\nexport FRONTEND_URL="https://' +
                            DOMAIN + '/" # origin\nJWT_SECRET=$(do-not-execute)\n', encoding="utf-8")
            self.assertEqual(monitor.current_domain(path), DOMAIN)
            for value in ("", "http://" + DOMAIN, "https://localhost", "https://" + DOMAIN + "/path",
                          "https://user:password@" + DOMAIN, "https://" + DOMAIN + "#fragment"):
                path.write_text("FRONTEND_URL=" + value + "\n", encoding="utf-8")
                with self.subTest(value=value), self.assertRaises(manager.SafetyError):
                    monitor.current_domain(path)

    def test_policy_rejects_unknown_fields_and_unsafe_confirmation_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            identity = root / "identity.env"
            identity.write_text("FRONTEND_URL=https://" + DOMAIN, encoding="utf-8")
            config = root / "monitor.json"
            data = {"config_dir": str(root), "identity_env": str(identity)}
            config.write_text(json.dumps(data), encoding="utf-8")
            self.assertEqual(monitor.Policy.load(config).confirmations, 3)
            for key, value in (("confirmations", 1), ("confirmations", True), ("grace_seconds", 0),
                               ("direct_dns", "true"), ("frontend_container", "--bad"),
                               ("unknown_field", True)):
                config.write_text(json.dumps(dict(data, **{key: value})), encoding="utf-8")
                with self.subTest(key=key), self.assertRaises(manager.SafetyError):
                    monitor.Policy.load(config)


if __name__ == "__main__":
    unittest.main()
