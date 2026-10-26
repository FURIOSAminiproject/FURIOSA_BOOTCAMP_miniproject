# ORS 전용 CI/CD

기준: 2026-10-26. 기존 NestJS 컨테이너와 별도로 공식 ORS v10.0.1을 실행한다.
워크플로우는 [deploy_ors.yml](../../../.github/workflows/deploy_ors.yml), 실행 구성은
[Compose 확장 파일](../../../docker-compose.ors.yml)과 [ORS 설정](../../../Docker/ors/ors-config.yml)이다.

## 실행 범위

- `main`의 ORS 설정·배포 코드·두 Compose 파일 변경: GitHub-hosted CI 후 기존 `[self-hosted, linux]` 러너에서 ORS만 배포한다.
- 같은 경로의 PR: GitHub-hosted CI만 실행한다. 운영 러너에서 PR 코드를 실행하지 않는다.
- 수동 실행: 모든 ref에서 CI를 실행할 수 있지만 배포는 `main`만 허용한다.
- 공식 멀티아키텍처 이미지의 digest를 고정한다. CI와 운영에서 같은 이미지 인덱스를 사용한다. CI의 실제 런타임 검사는 Linux amd64이며 ARM 운영 검증을 대신하지 않는다.
- 기존 NestJS·FastAPI·frontend 컨테이너를 재생성하거나 DB DDL·환경 파일을 자동 변경하지 않는다.

이번 범위는 ORS 컨테이너와 CI/CD 준비다. 현재 NestJS `OrsProvider`의 외부 HeiGIT 주소는 그대로다.
자체 ORS로 전환하려면 내부 주소 `http://ors:8082/ors/v2/directions/{profile}/geojson`을 선택하는
백엔드 설정·인증 처리와 요청 원본/데이터 버전별 캐시 분리가 별도로 필요하다.
현재 DB의 `source_url`은 HTTPS만 허용하므로 내부 HTTP 주소를 저장하려면 별도 변경 SQL도 검토해야 한다.
배경 지도 타일 생성·서비스와 지도/경로 버전의 동시 전환은 아직 구현하지 않았다.

## 서버에서 한 번 준비할 것

Linux Docker Engine, Compose 2.24.0 이상, Python 3.9 이상, `flock`을 준비한다.
기존 서비스와 동일한 저장소/Compose 프로젝트에서 실행한다. Docker 데몬에 접근할 수 있어야 한다.

1. 한국 또는 서비스 대상 지역의 `.osm.pbf`를 **체크아웃 밖**에 보관한다.
   [Geofabrik 한국 데이터](https://download.geofabrik.de/asia/south-korea.html) 등 적법한 원본을 사용한다.
   원본 파일은 매 배포마다 자동 다운로드하지 않는다.
2. `sha256sum /absolute/path/south-korea.osm.pbf`로 파일 체크섬을 구한다.
3. [배포 JSON 예시](../../../Docker/ors/deployment.example.json)를 체크아웃 밖의
   `~/.config/roadfriend/ors.json`에 복사하고 다섯 값을 실제 환경에 맞춘다.
   다른 경로는 GitHub Actions 저장소 변수 `ORS_DEPLOY_CONFIG` 또는 동일 이름의 환경변수로 지정한다.
4. `data_root`는 러너가 쓸 수 있는 전용 영구 디렉토리로 지정한다. `dataset_path`도 체크아웃 밖의 절대 경로다.
5. `probe_coordinates`는 해당 데이터 안에서 **자동차와 도보 모두 이동 가능한 서로 다른 두 지점**을 지정한다.
   배열 순서는 `[경도, 위도]`다. 예시 서울 좌표가 모든 데이터 범위에서 동작한다는 뜻은 아니다.

Python은 JSON을 데이터로 읽으며 셸 코드로 실행하지 않는다. 실제 설정 JSON과 OSM 파일을 Git에 넣지 않는다.
API 키는 자체 ORS의 이 내부 구성에 필요하지 않다. API 포트는 호스트 `127.0.0.1:8082`에만 열고
컨테이너 내부에서는 기존 `travel-network`의 서비스명 `ors:8082`로 접근한다.

## 수동 실행

어느 작업 폴더에서 호출해도 스크립트가 자신의 위치로 저장소 루트를 계산한다.

```bash
ORS_DEPLOY_CONFIG="$HOME/.config/roadfriend/ors.json" \
  bash CI_CD/BackEnd/ors/deploy.sh
```

기본 JVM은 초기 256MB/최대 2GB, 컨테이너 제한은 3GB·CPU 2개다. 이는 초기 설정이며 한국 전체
자동차/도보 경로망의 충분한 서버 사양을 보장하지 않는다. `ORS_JVM_XMS`, `ORS_JVM_XMX`,
`ORS_MEMORY_LIMIT`, `ORS_CPUS`를 배포 러너의 환경변수로 조절할 수 있다.
JVM 힙 외에도 네이티브/메모리 매핑 공간과 다른 서비스의 메모리가 필요하다.
처음에는 작은 지역으로 측정하고 전국 데이터로 늘린다.

## 검증·저장·실패 처리

`prepare.py`가 입력 SHA-256을 확인하고 복사본도 재검사한다. 원본 파일·이미지 digest·ORS 설정 해시로
릴리스를 구분하며 다른 릴리스의 기존 경로망을 재사용하지 않는다. 이전 스냅샷과 경로망은 자동 삭제하지 않는다.

```text
data_root/
  datasets/<OSM SHA-256>/input.osm.pbf
  releases/<release-id>/manifest.json
  releases/<release-id>/ors-config.yml
  releases/<release-id>/graphs/
  deploy.lock
  last-successful.json
```

OSM과 ORS 설정을 외부 저장소에 복사·검증한 뒤 읽기 전용으로 마운트한다. 실행 중 checkout 변경이
컨테이너의 설정 파일을 바꾸지 않는다. 배포 중 원래 JSON이 수정돼도 검증 대상은 준비한 사본으로 고정한다.
경로망은 위 영구 경로를 bind mount하고 로그는
프로젝트의 `ors-logs` named volume을 사용한다. 단순 컨테이너 교체로 지도를 다시 다운로드하지 않는다.
파일·이미지·설정이 같으면 이전 그래프를 재사용한다. ORS 최초 실행은 지정 데이터로 두 프로필을 구축한다.

배포 순서: 설정/파일 검사 → 데이터 저장소 잠금 → 스냅샷 준비 → Compose 해석 → 이미지 pull →
`up --detach --no-deps ors` → readiness → 네 가지 경로 요청 → 마지막 성공 릴리스 기록.
체크섬·설정·이미지 pull 실패는 컨테이너 교체 전에 중단한다.

준비 대기는 기본 1,800초이며 `ORS_WAIT_SECONDS`로 1~7,200초를 지정한다. health 요청마다 최대 5초,
각 경로 요청은 최대 30초다. `status=ready`와 자동차/도보 각각의 recommended/shortest에 대해
실제 LineString·양수 거리/시간·길안내 steps를 확인한다. Docker HEALTHCHECK와 배포 검사는 별개다.
초기 경로망 생성 중에는 health가 준비 상태가 아니므로 긴 start_period를 사용한다.

동일 데이터 저장소 배포는 `flock`으로 겹침을 차단한다. 교체 후 준비·경로 검사가 실패하면 배포를 실패로
기록하고 로그를 출력한다. 자동 롤백이나 무중단 배포는 아니다. `last-successful.json`은 마지막 성공 이력이며
현재 컨테이너의 가동 상태를 보증하지 않는다. 부분 생성된 경로망도 자동으로 지우지 않는다.

기존 서버 이미지·구성 및 실패한 릴리스의 상태를 확인한 뒤 이전 구성을 다시 배포해 복구한다.
이전 구성 파일도 별도로 보관해야 한다. 운영 데이터 저장소나 named volume에 `down -v`를 실행하지 않는다.

## CI

Docker 데몬·API·운영 서버 없이 준비 작업과 모의 배포의 성공/실패 처리를 검사할 수 있다.
Python 3.9 이상과 Bash가 필요하며 Windows에서는 Git Bash를 사용한다.

```bash
python3 -B -m unittest discover -s CI_CD/BackEnd/ors/tests -v
```

테스트는 체크아웃 밖의 임시 파일을 사용하고 Docker·flock·경로 검사를 모킹한다.
실제 ORS의 경로 품질이나 컨테이너 실행을 검증하는 테스트는 아니다.
`build.sh`는 이 검사를 먼저 실행한 후 아래 실제 기동 검사로 진행한다.

`build.sh`는 고정된 ORS v10.0.1 Heidelberg 테스트 파일(약 2.5MB)을 HTTPS로 받아 SHA-256을 확인한다.
운영 한국 데이터나 DB·인증키는 사용하지 않는다. 임시 데이터 저장소와 CI 전용 Compose 프로젝트를 만들고
동일 공식 이미지를 실제 기동해 네 가지 경로 검사를 실행한다. 검사 후 CI의 ORS 컨테이너만 정리한다.
이 검사가 통과해도 한국 전체 데이터의 품질·성능이나 운영 서버 용량이 검증되는 것은 아니다.

## 이번 로컬 검증

검증 결과와 실제 실행하지 못한 항목은 [CI/CD 검토 기록](../../REVIEW.md)의 ORS 추가 항목을 따른다.
워크플로우를 추가했다는 사실만으로 GitHub 실행·운영 배포가 완료된 것은 아니다.
