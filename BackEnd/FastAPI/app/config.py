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


def weather_data_directory(project_dir: Path | None = None) -> Path:
    """매핑과 추론이 같은 CSV를 사용한다. 명시 설정 → 저장소 데이터 → 이미지 내 데이터 순이다."""
    configured = os.getenv("WEATHER_DATA_DIR")
    if configured:
        return Path(configured).resolve()
    configured_project = os.getenv("WEATHER_PROJECT_DIR")
    if configured_project:
        return (Path(configured_project) / "6_dataset").resolve()
    service_root = Path(__file__).resolve().parent.parent
    shared_data = service_root.parent.parent / "weather_base_data"
    if shared_data.is_dir():
        return shared_data.resolve()
    project = project_dir if project_dir is not None else service_root / "app" / "routers" / "weather_prediction"
    return (project / "6_dataset").resolve()
