"""ORS가 준비됐는지 기다리고 자동차·도보의 추천/최단 경로를 실제 요청한다."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

from prepare import load_config


def request(url: str, body=None, timeout: float = 10):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    # 로컬 검증 요청을 호스트의 외부 프록시로 전달하지 않는다.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=timeout) as response:
        if response.status != 200:
            raise ValueError("unexpected HTTP status")
        return json.load(response)


def check(config: dict, wait_seconds: int) -> None:
    base = f"http://127.0.0.1:{config['http_port']}/ors/v2"
    deadline = time.monotonic() + wait_seconds
    while True:
        try:
            remaining = max(0.1, deadline - time.monotonic())
            health = request(base + "/health", timeout=min(5, remaining))
            if isinstance(health, dict) and health.get("status") == "ready":
                break
        except (OSError, ValueError):
            pass
        if time.monotonic() >= deadline:
            raise ValueError("ORS readiness deadline exceeded")
        time.sleep(min(2, max(0, deadline - time.monotonic())))
    for profile in ("driving-car", "foot-walking"):
        for preference in ("recommended", "shortest"):
            route = request(base + f"/directions/{profile}/geojson", {
                "coordinates": config["probe_coordinates"],
                "preference": preference, "instructions": True, "units": "m",
            }, timeout=30)
            feature = route["features"][0]
            geometry = feature["geometry"]
            summary = feature["properties"]["summary"]
            if geometry["type"] != "LineString" or len(geometry["coordinates"]) < 2:
                raise ValueError("ORS did not return route geometry")
            for key in ("distance", "duration"):
                value = summary[key]
                if type(value) not in (float, int) or not math.isfinite(value) or value <= 0:
                    raise ValueError("ORS did not return positive distance/duration")
            if not any(segment.get("steps") for segment in feature["properties"]["segments"]):
                raise ValueError("ORS did not return turn instructions")
            print(f"ORS route verified: {profile}/{preference}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--wait-seconds", type=int, default=1800)
    args = parser.parse_args()
    try:
        if not 1 <= args.wait_seconds <= 7200:
            raise ValueError("wait-seconds must be between 1 and 7200")
        check(load_config(args.config), args.wait_seconds)
    except (OSError, ValueError, KeyError, IndexError, TypeError) as error:
        print(f"ORS smoke check failed: {type(error).__name__}", file=sys.stderr)
        sys.exit(1)
