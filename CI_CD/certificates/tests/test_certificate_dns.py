"""DNS HTTPS protocol parsing with in-memory responses only."""
import io
import json
import ssl
from pathlib import Path
import sys
import unittest
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from certificate_dns import DNSResolver
from revoke_ip_certificates import SafetyError


NAME = "roadfriendtrip.freeddns.org"
ADDRESS = "32.236.200.229"


class Opener:
    def __init__(self, factory):
        self.factory = factory
        self.calls = []

    def open(self, request, timeout):
        self.calls.append(request)
        url = urlsplit(request.full_url)
        record = parse_qs(url.query)["type"][0]
        value = self.factory(url.hostname, record)
        if isinstance(value, Exception):
            raise value
        return io.BytesIO(value if isinstance(value, bytes) else json.dumps(value).encode())


def answer(record, addresses=None, status=0):
    kind = 1 if record == "A" else 28
    result = {"Status": status, "Question": [{"name": NAME + ".", "type": kind}]}
    if addresses:
        result["Answer"] = [{"name": NAME + ".", "type": kind, "TTL": 60, "data": ip}
                            for ip in addresses]
    else:
        result["Authority"] = [{"name": "freeddns.org.", "type": 6, "TTL": 0,
                                "data": "ns.example.test. hostmaster.example.test. 1 60 60 3600 0"}]
    return result


class DNSResolverTests(unittest.TestCase):
    def lookup(self, factory):
        resolver = DNSResolver()
        resolver.opener = Opener(factory)
        return resolver.lookup(NAME)

    def test_matching_resolvers_and_empty_ipv6(self):
        value = self.lookup(lambda host, record: answer(record, [ADDRESS] if record == "A" else []))
        self.assertEqual(value.addresses, frozenset([ADDRESS]))
        self.assertFalse(value.has_ipv6)
        self.assertEqual(value.ttl, 60)

    def test_confirmed_nxdomain_and_nodata_are_empty_not_network_errors(self):
        for status in (0, 3):
            with self.subTest(status=status):
                self.assertEqual(self.lookup(lambda host, record: answer(record, status=status)).addresses,
                                 frozenset())

    def test_disagreeing_resolvers_defer(self):
        with self.assertRaises(SafetyError):
            self.lookup(lambda host, record: answer(record, [ADDRESS if host == "dns.google" else "8.8.8.8"]
                                                   if record == "A" else []))

    def test_disagreeing_existence_between_a_and_aaaa_defers(self):
        with self.assertRaises(SafetyError):
            self.lookup(lambda host, record: answer(record, status=3 if record == "A" else 0))

    def test_timeout_servfail_and_truncation_defer(self):
        for value in (TimeoutError(), ssl.SSLCertVerificationError("untrusted CA"),
                      {"Status": 2}, b"x" * 65537,
                      dict(answer("A"), TC=True)):
            with self.subTest(value=type(value).__name__), self.assertRaises(SafetyError):
                self.lookup(lambda host, record: value)

    def test_negative_cache_soa_ttl_is_preserved(self):
        for status in (0, 3):
            def factory(host, record):
                value = answer(record, status=status)
                value["Authority"] = [{"name": "freeddns.org.", "type": 6, "TTL": 3600,
                                       "data": "ns.example.test. hostmaster.example.test. 1 60 60 3600 3600"}]
                return value
            with self.subTest(status=status):
                self.assertEqual(self.lookup(factory).ttl, 3600)

    def test_ipv6_presence_is_reported_for_conservative_handling(self):
        value = self.lookup(lambda host, record: answer(record, [ADDRESS] if record == "A" else
                                                       ["2606:4700:4700::1111"]))
        self.assertTrue(value.has_ipv6)

    def test_absence_without_soa_or_with_unrelated_soa_is_inconclusive(self):
        for status in (0, 3):
            for zone in (None, "unrelated.example.test."):
                def factory(host, record):
                    value = answer(record, status=status)
                    if zone is None:
                        value.pop("Authority")
                    else:
                        value["Authority"][0]["name"] = zone
                    return value
                with self.subTest(status=status, zone=zone), self.assertRaises(SafetyError):
                    self.lookup(factory)

    def test_incomplete_cname_is_not_an_absent_address(self):
        def factory(host, record):
            value = answer(record)
            value["Answer"] = [{"name": NAME, "type": 5, "TTL": 60,
                                "data": "alias.other-zone.test."}]
            return value  # freeddns.org SOA cannot prove absence at other-zone.test.
        with self.assertRaises(SafetyError):
            self.lookup(factory)

    def test_negative_ttl_uses_soa_minimum(self):
        def factory(host, record):
            value = answer(record)
            value["Authority"][0].update(TTL=3600,
                data="ns.example.test. hostmaster.example.test. 1 60 60 3600 1200")
            return value
        self.assertEqual(self.lookup(factory).ttl, 1200)

    def test_malformed_soa_and_status_defer(self):
        for invalid in ("soa", "status"):
            def factory(host, record):
                value = answer(record)
                if invalid == "soa":
                    value["Authority"][0]["data"] = "broken"
                else:
                    value["Status"] = False
                return value
            with self.subTest(invalid=invalid), self.assertRaises(SafetyError):
                self.lookup(factory)

    def test_private_addresses_and_wrong_questions_defer(self):
        wrong = answer("A", [ADDRESS])
        wrong["Question"][0]["name"] = "unrelated.example.test"
        for factory in (lambda host, record: answer(record, ["127.0.0.1"]),
                        lambda host, record: wrong):
            with self.assertRaises(SafetyError):
                self.lookup(factory)

    def test_cname_chain_is_followed_and_ttl_is_preserved(self):
        def factory(host, record):
            value = answer(record)
            if record == "A":
                value["Answer"] = [
                    {"name": NAME, "type": 5, "TTL": 600, "data": "alias.example.test."},
                    {"name": "alias.example.test.", "type": 1, "TTL": 60, "data": ADDRESS},
                ]
            return value
        value = self.lookup(factory)
        self.assertEqual(value.addresses, frozenset([ADDRESS]))
        self.assertEqual(value.ttl, 600)

    def test_cname_loops_and_unrelated_answers_defer(self):
        def loop(host, record):
            value = answer(record)
            value["Answer"] = [{"name": NAME, "type": 5, "TTL": 60, "data": NAME}]
            return value
        def unrelated(host, record):
            value = answer(record, [ADDRESS])
            value["Answer"][0]["name"] = "unrelated.example.test"
            return value
        for factory in (loop, unrelated):
            with self.assertRaises(SafetyError):
                self.lookup(factory)


if __name__ == "__main__":
    unittest.main()
