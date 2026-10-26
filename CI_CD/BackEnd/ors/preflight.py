"""공유 서버의 메모리 여유와 ORS 제한을 검사하고 다운로드/기동 전에 배포를 차단한다.

수치는 한국 전체 그래프의 충분한 사양을 보장하는 값이 아니라, 작은 DB 공유 서버에서
무거운 작업을 시작하지 않기 위한 이 프로젝트의 보수적 하한이다. Linux 호스트 러너에서 호출한다.
"""
from __future__ import annotations

import argparse
from decimal import Decimal
import math
import os
from pathlib import Path
import re
import sys

GIB = 1024 ** 3
MIB = 1024 ** 2
MIN_HOST = 6 * GIB
HOST_RESERVE = 2 * GIB
AVAILABLE_RESERVE = GIB
JVM_NATIVE_RESERVE = 512 * MIB


def memory_size(value: str) -> int:
    """Compose/JVM에서 쓰는 바이트·k/m/g/t 단위를 바이트 수로 정규화한다."""
    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)([kmgt]?)(?:b)?", value.strip().lower())
    if not match:
        raise ValueError("invalid ORS memory size")
    unit_power = {"": 0, "k": 1, "m": 2, "g": 3, "t": 4}[match[2]]
    size = int(Decimal(match[1]) * 1024 ** unit_power)
    if size <= 0:
        raise ValueError("ORS memory size must be positive")
    return size


def read_memory(path: Path = Path("/proc/meminfo")) -> dict:
    """swap 여유를 가용 RAM으로 취급하지 않으며 필요한 값을 읽지 못하면 중단한다."""
    result = {}
    for line in path.read_text(encoding="ascii").splitlines():
        key, _, text = line.partition(":")
        if key in ("MemTotal", "MemAvailable"):
            parts = text.split()
            if len(parts) != 2 or parts[1] != "kB":
                raise ValueError("unrecognized Linux memory information")
            result[key] = int(parts[0]) * 1024
    if (set(result) != {"MemTotal", "MemAvailable"}
            or not 0 < result["MemAvailable"] <= result["MemTotal"]):
        raise ValueError("cannot determine host memory headroom")
    return result


def check(memory: dict, docker_memory: int, cpus: int, settings: dict) -> dict:
    """작은 호스트·여유 메모리 부족·잘못된 JVM/CPU 예산을 허용하지 않는다."""
    limit = memory_size(settings.get("ORS_MEMORY_LIMIT") or "3g")
    xmx = memory_size(settings.get("ORS_JVM_XMX") or "2g")
    xms = memory_size(settings.get("ORS_JVM_XMS") or "256m")
    if docker_memory <= 0 or cpus <= 0:
        raise ValueError("cannot determine Docker/host resource capacity")
    # Docker 데몬과 러너가 보고하는 메모리 중 작은 쪽을 사용한다.
    total = min(memory["MemTotal"], docker_memory)
    required_total = max(MIN_HOST, limit + HOST_RESERVE)
    if total < required_total:
        raise ValueError(
            f"host RAM {total / GIB:.2f} GiB is below the deployment floor "
            f"{required_total / GIB:.2f} GiB; use a separate/sufficient ORS host"
        )
    # 기존 ORS가 RAM을 사용 중이면 재배포도 보수적으로 거부할 수 있다.
    # 임의로 다른 서비스를 중지하거나 swap으로 부족분을 채우지 않는다.
    required_available = limit + AVAILABLE_RESERVE
    if memory["MemAvailable"] < required_available:
        raise ValueError(
            f"available RAM {memory['MemAvailable'] / GIB:.2f} GiB is below "
            f"{required_available / GIB:.2f} GiB; preserve DB/OS headroom"
        )
    if xms > xmx or xmx + JVM_NATIVE_RESERVE > limit:
        raise ValueError("JVM heap must fit the container with at least 512 MiB native headroom")
    cpu_limit = float(settings.get("ORS_CPUS") or "0.5")
    # 공유 서버에서 ORS가 모든 CPU를 점유하도록 설정하는 실수를 차단한다.
    # 1 vCPU 호스트는 반 개, 그 이상은 최소 1 vCPU를 다른 서비스에 남긴다.
    cpu_budget = max(0.5, cpus - 1)
    if not math.isfinite(cpu_limit) or not 0 < cpu_limit <= cpu_budget:
        raise ValueError(f"ORS_CPUS must be positive and no more than {cpu_budget:g}")
    return {"memory_limit": limit, "cpu_limit": cpu_limit}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docker-memory-bytes", type=int, required=True)
    args = parser.parse_args()
    result = check(read_memory(), args.docker_memory_bytes, os.cpu_count() or 0, os.environ)
    print(f"ORS resource check passed: CPU limit={result['cpu_limit']:g}, "
          f"container RAM={result['memory_limit'] / GIB:.2f} GiB")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"ORS deployment blocked: {error}", file=sys.stderr)
        sys.exit(1)
