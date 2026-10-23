"""두 HTTPS DNS resolver의 일치한 결과만 사용한다. 네트워크 오류와 NXDOMAIN을 구분한다."""
from dataclasses import dataclass
import ipaddress
import json
import re
from urllib.parse import urlencode
from urllib.request import build_opener, ProxyHandler, Request

from revoke_ip_certificates import NoRedirect, SafetyError


def domain_name(value):
    name = value.lower().rstrip(".")
    if (len(name) > 253 or "." not in name or
            not all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", part)
                    for part in name.split("."))):
        raise SafetyError("Invalid DNS hostname")
    try:
        ipaddress.ip_address(name)
    except ValueError:
        return name
    raise SafetyError("FRONTEND_URL must use a DNS hostname, not a raw IP")


@dataclass(frozen=True)
class DNSResult:
    addresses: frozenset
    has_ipv6: bool = False
    ttl: int = 0


class DNSResolver:
    ENDPOINTS = ("https://dns.google/resolve", "https://cloudflare-dns.com/dns-query")

    def __init__(self):
        # IMDS와 마찬가지로 환경 proxy나 다른 호스트로의 redirect를 사용하지 않는다.
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def query(self, endpoint, name, record_type):
        url = endpoint + "?" + urlencode({"name": name, "type": record_type})
        request = Request(url, headers={"Accept": "application/dns-json"})
        try:
            with self.opener.open(request, timeout=5) as response:
                body = response.read(65537)
            if len(body) > 65536:
                raise ValueError("Oversized DNS response")
            value = json.loads(body)
            question = value.get("Question", [])
            expected_type = 1 if record_type == "A" else 28
            if (len(question) != 1 or question[0].get("type") != expected_type or
                    question[0].get("name", "").lower().rstrip(".") != name):
                raise ValueError("DNS question mismatch")
            if (type(value.get("Status")) is not int or value["Status"] not in (0, 3)
                    or value.get("TC", False)):
                raise ValueError("DNS lookup is inconclusive")
            # 새 레코드의 전파 중 NXDOMAIN/NODATA 캐시가 남을 수 있다.
            # SOA 응답의 남은 TTL만큼도 기다려 캐시된 부재를 즉시 폐기로 오판하지 않는다.
            authority = value.get("Authority", [])
            if not isinstance(authority, list) or len(authority) > 100:
                raise ValueError("Invalid DNS authority section")

            def negative_ttl(target):
                # 빈 Answer는 referral·불완전 CNAME 응답일 수도 있다. 해당 이름을
                # 포함하는 zone의 SOA가 있어야 NXDOMAIN/NODATA를 폐기 근거로 쓴다.
                durations = []
                for item in authority:
                    if item.get("type") != 6:
                        continue
                    zone = item.get("name", "").lower().rstrip(".")
                    if zone and target != zone and not target.endswith("." + zone):
                        continue
                    if not item.get("name"):
                        continue
                    fields = item.get("data", "").split()
                    duration = item.get("TTL")
                    if (len(fields) != 7 or not fields[-1].isascii() or not fields[-1].isdigit()
                            or type(duration) is not int or not 0 <= duration <= 604800
                            or not 0 <= int(fields[-1]) <= 604800):
                        raise ValueError("Invalid negative DNS SOA")
                    durations.append(min(duration, int(fields[-1])))
                if not durations:
                    raise ValueError("DNS absence lacks an applicable SOA")
                return max(durations)
            # 두 resolver에서 일치한 Status 3만 이름이 없다는 응답으로 취급한다.
            if value["Status"] == 3:
                if value.get("Answer"):
                    raise ValueError("Inconsistent NXDOMAIN answer")
                return (3, frozenset(), negative_ttl(name))

            answers = value.get("Answer", [])
            if not isinstance(answers, list) or len(answers) > 100:
                raise ValueError("Invalid DNS answers")
            # 관련 없는 응답은 섞지 않고 질문한 이름에서 시작하는 CNAME만 따라간다.
            current = name
            visited = set()
            ttl = 0
            for _ in range(16):
                if current in visited:
                    raise ValueError("CNAME loop")
                visited.add(current)
                records = [item for item in answers
                           if item.get("name", "").lower().rstrip(".") == current]
                if current == name and answers and not records:
                    raise ValueError("Answers do not belong to the requested name")
                aliases = {domain_name(item["data"]) for item in records if item.get("type") == 5}
                if len(aliases) > 1:
                    raise ValueError("Ambiguous CNAME")
                values = set()
                for item in records:
                    if item.get("type") not in (5, expected_type):
                        continue
                    duration = item.get("TTL", 0)
                    if type(duration) is not int or not 0 <= duration <= 604800:
                        raise ValueError("Invalid DNS TTL")
                    ttl = max(ttl, duration)
                    if item["type"] == expected_type:
                        address = ipaddress.ip_address(item["data"])
                        if address.version != (4 if expected_type == 1 else 6) or not address.is_global:
                            raise ValueError("Unexpected DNS address")
                        values.add(str(address))
                if values:
                    if aliases:
                        raise ValueError("CNAME and address coexist")
                    return (0, frozenset(values), ttl)
                if not aliases:
                    return (0, frozenset(), max(ttl, negative_ttl(current)))
                current = aliases.pop()
            raise ValueError("Too many CNAMEs")
        except Exception as error:
            raise SafetyError("DNS lookup failed or was inconclusive for " + name) from error

    def lookup(self, name):
        name = domain_name(name)
        snapshots = []
        ttl = 0
        for endpoint in self.ENDPOINTS:
            status_a, addresses, ttl_a = self.query(endpoint, name, "A")
            status_aaaa, ipv6, ttl_aaaa = self.query(endpoint, name, "AAAA")
            if status_a != status_aaaa:
                raise SafetyError("DNS A/AAAA disagree about existence: " + name)
            snapshots.append((status_a, addresses, ipv6))
            ttl = max(ttl, ttl_a, ttl_aaaa)
        if snapshots[0] != snapshots[1]:
            raise SafetyError("Independent DNS resolvers disagree: " + name)
        _, addresses, ipv6 = snapshots[0]
        return DNSResult(addresses, bool(ipv6), ttl)
