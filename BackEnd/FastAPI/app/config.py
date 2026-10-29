"""FastAPI와 NestJS가 같은 BackEnd/.env.<mode> 설정을 사용한다."""
import os
from collections.abc import MutableMapping
from pathlib import Path

from dotenv import dotenv_values


def load_environment(
    root: Path | None = None,
    environ: MutableMapping[str, str] | None = None,
) -> str:
    """서비스 파일 → BackEnd 공통 파일 → 시스템 환경 순으로 우선한다."""
    env = os.environ if environ is None else environ
    raw_mode = env.get("APP_ENV", "production")
    mode = {"dev": "development", "prod": "production", "op": "production"}.get(raw_mode, raw_mode)
    if mode not in {"local", "development", "production"}:
        raise ValueError("APP_ENV must be local, development, or production")
    service_root = root if root is not None else Path(__file__).resolve().parents[1]
    values = {}
    for path in (service_root / f".env.{mode}", service_root.parent / f".env.{mode}"):
        if path.is_file():
            values.update({key: value for key, value in dotenv_values(path).items() if value is not None})
    for key, value in values.items():
        env.setdefault(key, value)
    env["APP_ENV"] = mode
    return mode


def validate_database_configuration(environ: MutableMapping[str, str] | None = None) -> None:
    """DB 설정 누락은 요청마다 500을 내는 대신 기동 단계에서 알린다. 비밀값은 출력하지 않는다."""
    env = os.environ if environ is None else environ
    missing = [key for key in ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME") if not env.get(key, "").strip()]
    if missing:
        raise ValueError("Missing database configuration: " + ", ".join(missing))
    port = env.get("DB_PORT", "5432")
    if not port.isascii() or not port.isdigit() or not 1 <= int(port) <= 65535:
        raise ValueError("Invalid DB_PORT")
    if env.get("DB_SSL", "false") not in {"true", "false"}:
        raise ValueError("DB_SSL must be true or false")
