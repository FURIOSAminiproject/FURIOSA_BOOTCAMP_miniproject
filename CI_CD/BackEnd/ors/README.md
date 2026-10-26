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

## 새 서버의 자동 준비

Linux Docker Engine, Compose 2.24.0 이상, Python 3.9 이상, `flock`과 Docker 접근 권한을 갖춘
self-hosted 러너를 사용한다. 기존 서비스와 동일한 저장소/Compose 프로젝트에서 실행한다.
Geofabrik·이미지 registry로의 HTTPS 접근과 OSM 원본·사본·자동차/도보 경로망을 보관할 디스크 공간이 필요하다.
기본 자원 제한의 충분성은 아래 자원 설정 항목을 따른다. Docker·러너 자체를 설치하는 스크립트는 아니다.

서버에서 `mkdir`, JSON 복사·편집, 체크섬 계산을 수동 실행할 필요가 없다. 설정이 없는 첫 배포에서는
`deploy.sh`가 저장소의 [bootstrap.json](../../../Docker/ors/bootstrap.json)을 읽어 다음 작업을 수행한다.

1. 러너 계정의 `~/.local/share/roadfriend/ors`를 저장소로 선택하고 배포 잠금을 획득한다.
2. [Geofabrik 한국 데이터](https://download.geofabrik.de/asia/south-korea.html)의 최신 `.osm.pbf`를 스트리밍으로 받는다.
3. HTTPS 전송과 배포처 MD5를 검사한다. 다운로드 전후의 MD5가 달라져도 중단한다.
   MD5는 전송 손상 검사에 사용하며 별도 서명 인증을 뜻하지 않는다.
4. 다운로드한 파일의 SHA-256을 계산하고 `sources/<SHA-256>.osm.pbf`에 저장한다.
5. 실제 경로·SHA-256·검증 좌표·포트 및 출처/다운로드 시각을 담은
   `~/.config/roadfriend/ors.json`을 생성한 후 기존 준비·배포 절차로 진행한다.

다운로드는 연결/읽기당 최대 30초, 본문 루프 최대 900초, 최대 2GiB로 제한한다.
전송 중단·크기/체크섬 불일치 시 임시 파일을 정리하고 설정을 생성하지 않으며 ORS를 교체하지 않는다.
다음 배포에서 다시 시도한다. 완료된 설정 파일은 원자적으로 생성하며 기존 파일을 덮어쓰지 않는다.

기존 JSON이 있으면 해당 `data_root`와 OSM을 재사용하며 다운로드하지 않는다. 잘못된 기존 JSON이나
손상된 데이터는 오류로 중단한다. `latest`는 처음 준비하는 시점에만 조회하며 이후 배포마다 갱신하지 않는다.
서로 다른 시점에 처음 설치한 서버는 데이터 버전이 다를 수 있다. 같은 버전이 필요하면 동일 OSM·SHA-256의
설정을 명시적으로 공급해야 한다. 자동 갱신·여러 서버의 지도 버전 동시 전환은 구현하지 않았다.

기본값을 바꿀 때는 GitHub Actions 저장소 Variables 또는 수동 실행 환경변수를 사용한다.

| 변수 | 기본값 / 동작 |
|---|---|
| `ORS_DEPLOY_CONFIG` | `$HOME/.config/roadfriend/ors.json`; 없으면 자동 생성 |
| `ORS_DATA_ROOT` | `$HOME/.local/share/roadfriend/ors`; 첫 생성에만 사용, 기존 JSON의 `data_root` 우선 |

두 경로는 체크아웃 밖의 절대 경로여야 하며 러너가 쓸 수 있어야 한다. 다운로드 지역·검증 좌표·포트의
기준은 버전 관리하는 `Docker/ors/bootstrap.json`이다. 좌표 배열은 `[경도, 위도]`다.
한국 이외의 지역으로 바꾸면 자동차·도보 모두 이동 가능한 검증 좌표도 함께 바꾼다.

별도 OSM 파일을 쓰려면 [배포 JSON 예시](../../../Docker/ors/deployment.example.json)에 실제 경로·SHA-256·좌표를
지정해 먼저 공급할 수도 있다. 예시 파일은 자동 초기화 과정에서 복사하지 않는다.
Python은 JSON을 데이터로 읽으며 셸 코드로 실행하지 않는다. 생성한 설정 JSON과 OSM 파일은 Git에 넣지 않는다.
API 키는 자체 ORS의 이 내부 구성에 필요하지 않다. API 포트는 호스트 `127.0.0.1:8082`에만 열고
컨테이너 내부에서는 기존 `travel-network`의 서비스명 `ors:8082`로 접근한다.

## 수동 실행

어느 작업 폴더에서 호출해도 스크립트가 자신의 위치로 저장소 루트를 계산한다.

```bash
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
  sources/<OSM SHA-256>.osm.pbf
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

배포 순서: 실행 환경 검사 → 저장소 선택/잠금 → 최초 자동 준비 또는 설정 재사용 → 스냅샷 준비 → Compose 해석 → 이미지 pull →
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

테스트는 체크아웃 밖의 임시 파일을 사용하고 최초 다운로드 HTTP·Docker·flock·경로 검사를 모킹한다.
실제 ORS의 경로 품질이나 컨테이너 실행을 검증하는 테스트는 아니다.
`build.sh`는 이 검사를 먼저 실행한 후 아래 실제 기동 검사로 진행한다.

`build.sh`는 고정된 ORS v10.0.1 Heidelberg 테스트 파일(약 2.5MB)을 HTTPS로 받아 SHA-256을 확인한다.
운영 한국 데이터나 DB·인증키는 사용하지 않는다. 임시 데이터 저장소와 CI 전용 Compose 프로젝트를 만들고
동일 공식 이미지를 실제 기동해 네 가지 경로 검사를 실행한다. 검사 후 CI의 ORS 컨테이너만 정리한다.
이 검사가 통과해도 한국 전체 데이터의 품질·성능이나 운영 서버 용량이 검증되는 것은 아니다.

## 이번 로컬 검증

검증 결과와 실제 실행하지 못한 항목은 [CI/CD 검토 기록](../../REVIEW.md)의 ORS 추가 항목을 따른다.
워크플로우를 추가했다는 사실만으로 GitHub 실행·운영 배포가 완료된 것은 아니다.
