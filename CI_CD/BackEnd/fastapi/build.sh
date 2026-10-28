#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: build.sh
# 위    치: CI_CD/BackEnd/fastapi/build.sh
# 목    적: FastAPI AI 추론 엔진 프로젝트 의존성 검증, 문법 점검 및 빌드 검증
# 실    행: GitHub Actions build 잡 러너(ubuntu-latest)에서 호출됨
# ==============================================================================

set -euo pipefail

# 1. 프로젝트 최상위 루트 디렉토리 경로 계산 (CI_CD/BackEnd/fastapi -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# 2. FastAPI 프로젝트 디렉토리로 이동
cd "$PROJECT_ROOT/BackEnd/FastAPI"

# 3. Python 및 pip 버전 확인
echo "===== [1/4] Python 및 pip 버전 확인 ====="
python3 --version
pip --version

# 4. 의존성 패키지 설치
echo "===== [2/4] 패키지 설치 (pip install) ====="
pip install --upgrade pip
pip install -r requirements.txt

# 5. Python 코드 문법 검사 (Bytecode compilation check)
echo "===== [3/4] 파이썬 소스코드 문법 검사 (py_compile) ====="
python3 -m py_compile main.py

# 6. 핵심 모듈 임포트 검증 (Sanity Check)
echo "===== [4/4] FastAPI 모듈 로드 검증 ====="
python3 -c "from main import app; print('>> FastAPI App Loaded Successfully: ' + app.title)"

echo "===== 추론 모듈 런타임 의존성 확인 (DB/모델 호출 없음) ====="
python3 -c "import sys; from pathlib import Path; sys.path.insert(0, 'app/routers/weather_prediction'); from predict_weather import predict_many_dates, resolve_dataset_path; root = Path('app/routers/weather_prediction/6_dataset'); sample = next(root.rglob('LSTM_*.csv')); relative = sample.relative_to(root).as_posix(); assert resolve_dataset_path(root, relative.replace('/', chr(92))) == sample.resolve(); print('>> Prediction module and Windows dataset path verified')"

echo ">> FastAPI AI 엔진 빌드 및 검증 성공 완료!"
