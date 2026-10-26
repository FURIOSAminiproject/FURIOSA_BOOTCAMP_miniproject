# 장소 수집·경로 코드를 처음 읽는 순서

기준: 2026-10-26. 실제 서비스 코드는 `BackEnd/NestJS/src/places`와 `src/routing-cache`에 있다. 함수 이름을 먼저 외우기보다 아래 두 흐름을 따라 읽으면 된다. 구현 교체와 SOLID 구조는 [유지보수 안내](ORS_PLACE_MAINTENANCE.md)를 참고한다.

## 주석을 읽는 방법

각 함수·메서드·생성자·내부 콜백과 인터페이스 메서드에 역할, 입력, `@returns` 출력, `@example` 예시를 적었다. 함수가 외부 API를 부르거나 DB·파일을 변경하면 그 동작과 실패 조건도 설명한다.

```ts
/**
 * 같은 시각을 한국 날짜 YYYYMMDD로 표현한다.
 * 입력: date는 변환할 Date다.
 * @returns 8자리 한국 날짜 문자열.
 * @example
 * seoulDate(new Date('2026-10-25T16:00:00Z')); // '20261026'
 */
```

`Promise<T>`는 비동기 작업이 끝나면 `T` 값을 받을 수 있다는 뜻이다. `await`로 기다린다. `void`는 돌려줄 업무 결과값이 없다는 뜻이며, 로그·DB 저장까지 하지 않는다는 뜻은 아니다. `null`은 이 코드에서 정한 “값 없음”이고, 예외는 호출이 실패했음을 알린다.

`interface`는 입력·출력의 약속이다. DB나 API를 실제로 실행하는 코드는 그 인터페이스를 구현한 클래스에 있다. 생성자에서 받는 `mapper`, `store`, `resolver` 등은 맡길 일을 하는 객체다. 실제 객체를 연결하는 곳은 `*.module.ts`다.

예시는 코드 설명이다. `api`, `runner`, `options` 등의 객체는 주변 설정이 준비되어 있다고 가정한다. `// 입력 → 출력` 형태는 결과 설명이고, 그대로 실행할 독립 스크립트는 아니다. 인증키 예시에 있는 `demo`는 실제 키가 아니다.

## 1. 장소를 API에서 받아 DB에 넣는 흐름

| 순서 | 읽을 파일 | 확인할 내용 |
|---|---|---|
| 1 | [수집 옵션](../src/places/tour-ingestion.options.ts) / [HTTP 옵션](../src/places/batch/tour-manual.options.ts) | 무엇을, 몇 페이지, 상세까지 받을지. CLI와 HTTP의 기본값은 다르다. |
| 2 | [수집 실행 서비스](../src/places/tour-ingestion.service.ts) | 잠금 → 테이블 확인 → 기준정보 → 목록 → 선택적 상세 → 결과 집계 |
| 3 | [목록 계획](../src/places/tour-list-plans.ts) | 초기 목록·수정분·축제 중 어떤 API를 호출하는지 |
| 4 | [API 클라이언트](../src/places/tour-api.client.ts) | 요청 간격·한도·재시도·응답 페이지 검증 |
| 5 | [기준정보](../src/places/tour-reference.service.ts) / [상세](../src/places/tour-detail.service.ts) | 분류·지역 준비와 한 장소의 상세 응답 묶음 |
| 6 | [컬럼 변환](../src/places/tour-mapping.ts) / [기존 값 병합](../src/places/tour-place.mapper.ts) | 외부 필드가 어떤 DB 컬럼이 되고, 기존 값을 언제 유지하는지 |
| 7 | [장소 저장](../src/places/tour-store.ts) / [분류 저장](../src/places/tour-category.repository.ts) | INSERT/UPDATE, 기존 내부 UUID 유지, 변경 여부 판정 |
| 8 | [DB 세션](../src/places/tour-db.session.ts) / [출처 정리](../src/places/tour-provenance.ts) | 잠금·트랜잭션·인증정보 제거 |
| 9 | [조립 함수](../src/places/tour-run.factory.ts) | 위 담당들을 한 수집 서비스로 연결하는 방법 |

예를 들어 TourAPI의 `contentid='126128'`, `title='동촌유원지'`, `mapx='128.6506105'`, `mapy='35.8825752'`는 `content_id='126128'`, `name='동촌유원지'`, `longitude=128.6506105`, `latitude=35.8825752`로 변환된다. 분류·지역 코드의 한글명은 먼저 읽은 기준정보에서 찾는다.

`content_id`는 외부 장소 ID이고 `place_id`는 우리 DB의 UUID다. 같은 외부 장소를 다시 수집해도 기존 `place_id`를 유지한다. 목록 응답에 설명이 없다는 이유로 이미 저장한 상세 설명을 지우지 않는다. 수집 URL과 API별 최신 원본 응답은 인증 필드를 제거한 뒤 저장한다.

`inserted`, `updated`, `unchanged`는 기본 장소 저장 결과다. `enriched`는 추가 상세 저장 성공 횟수이므로 앞의 횟수와 겹칠 수 있다. 숫자를 모두 더해 고유 장소 수로 해석하면 안 된다. 요금 설명이 모호하면 `amount=null`로 두고 원문을 보존한다.

## 2. 매일 새벽 수집과 수동 실행

[스케줄러](../src/places/batch/tour-batch.scheduler.ts)는 한국 시간 매일 01:00에 [배치 실행기](../src/places/batch/tour-batch.runner.ts)의 `run()`을 호출한다. [설정](../src/places/batch/tour-batch.config.ts)에서 조회 범위를 만들고, [상태 파일](../src/places/batch/tour-batch.state.ts)에 마지막 완전 성공 날짜를 기록한다. 실패·잘못된 항목·남은 페이지가 있으면 성공 날짜를 앞으로 옮기지 않는다.

[컨트롤러](../src/places/batch/tour-batch.controller.ts)의 수동 수집은 같은 저장 로직을 사용한다. `runManual()`은 일일 배치의 마지막 성공 날짜를 변경하지 않는다. 기존 GET 수집 주소도 실제 API 호출과 DB 저장을 수행한다.

| 로그 | 의미 |
|---|---|
| `tour_batch_scheduled` | 서버가 예약 실행 시간을 안내했다. 실제 수집 완료가 아니다. |
| `tour_batch_started` / `tour_manual_started` | 이번 수집을 시작했다. |
| `tour_batch_completed` / `tour_manual_completed` | 완료 결과와 처리 건수를 확인한다. |
| `tour_batch_failed` / `tour_manual_failed` | 실패 사유와 있으면 부분 집계를 확인한다. |
| `tour_batch_skipped` / `tour_manual_skipped` | 다른 수집 실행 중 등으로 이번 실행을 건너뛰었다. |

## 3. 사용자가 경로를 요청하는 흐름

| 순서 | 읽을 파일 | 확인할 내용 |
|---|---|---|
| 1 | [컨트롤러](../src/routing-cache/routing.controller.ts) / [입력 검사](../src/routing-cache/routing.validation.ts) | POST JSON에 허용한 필드와 2~10개 지점이 있는지 |
| 2 | [경로 서비스](../src/routing-cache/routing.service.ts) | 좌표 해석 → ORS 요청 형식 → 캐시 조회 → 응답 조립 |
| 3 | [지점 해석](../src/routing-cache/route-point.resolver.ts) / [장소 좌표 SQL](../src/routing-cache/place-coordinate.repository.ts) | UUID를 DB 좌표로 바꾸기. 직접 좌표면 DB 읽기 생략 |
| 4 | [캐시 흐름](../src/routing-cache/cache-coordinator.ts) / [저장 SQL](../src/routing-cache/cache-repositories.ts) | 같은 요청 해시, 캐시 재사용, 없을 때 새 결과 저장 |
| 5 | [ORS 호출](../src/routing-cache/ors.provider.ts) / [HTTP 처리](../src/routing-cache/provider-http.ts) | 인증 헤더·제한 시간·외부 실패 처리 |
| 6 | [응답 변환](../src/routing-cache/ors-response.mapper.ts) | GeoJSON, 구간 인덱스, 거리·시간을 검증 |
| 7 | [정책](../src/routing-cache/routing.policy.ts) / [정리 실행](../src/routing-cache/cache-maintenance.ts) / [정리 SQL](../src/routing-cache/ors-cache-maintenance.repository.ts) | 유효기간과 만료 행 삭제 |

```json
{
  "mode": "driving",
  "points": [
    { "longitude": 128.9459775, "latitude": 35.1044927 },
    { "longitude": 128.9680206, "latitude": 35.0463559 }
  ]
}
```

이는 `POST /api/routes`의 요청 본문 예시다. `preference`를 생략하면 `recommended`다. 좌표 대신 각 지점을 `{ "placeId": "실제 places 행의 UUID" }`로 지정할 수 있다. 같은 지점 객체에 UUID와 좌표를 섞지 않는다. 위 문장의 UUID 설명은 실제 값으로 바꿔야 한다.

출력의 `distanceMeters=8383.3`은 약 8.38km, `durationSeconds=625.3`은 약 10분 25초를 뜻한다. 이는 출력 필드 해석 예시이며 위 요청의 현재 API 결과를 보장하는 값이 아니다. `timeSpans`의 `fromIndex`와 `toIndex`는 경로 좌표 배열의 위치이고 시간은 초다. 예를 들어 `0→10, 15.6초`는 0번 좌표부터 10번 좌표까지의 예상 이동시간이다.

좌표 객체는 이름으로 위도·경도를 구분하지만 ORS/GeoJSON 배열의 순서는 반드시 **[경도, 위도]**다. 현재 `trafficApplied=false`이며 예상시간에 실시간 정체는 반영하지 않는다.

## 4. 24시간과 매분 실행의 차이

10월 26일 10시에 새 경로를 받아 저장했다면 만료 시각은 10월 27일 10시다. 그전의 같은 요청은 유효 캐시를 사용한다. 만료 후 같은 요청이 들어오면 ORS를 다시 호출하고 저장한다.

매분 실행되는 작업은 만료 행을 한 번에 최대 1,000개 삭제할 뿐이다. 모든 경로를 매일 다시 받는 배치가 아니다. 삭제 작업이 조금 늦어도 조회 SQL은 `expires_at > 현재 시각`인 행만 사용한다. 캐시를 재사용하면 `fetchedAt`·`calculatedAt`이 응답을 받은 현재 시각으로 바뀌지 않는다.

## 5. 이번 정리의 검증

- 장소·경로의 운영 TypeScript 46개 파일에서 함수·메서드·생성자·콜백·인터페이스 메서드 235곳의 입력/출력/예시와 데이터 필드 131곳의 설명을 작성했다. 테스트 파일의 단순 포맷 변경은 배포 커밋에서 제외했다.
- 이번 주석·들여쓰기 작업 전후 47개 TypeScript 파일을 주석 제외 JavaScript 구문 트리로 비교해 실행 구조와 리터럴이 같음을 확인했다. 앞서 진행한 SOLID 리팩터링은 비교 기준에 이미 포함되어 있다.
- Node 22.23.3에서 기존 npm test 17개와 저장소 밖 회귀 검증 62개, 총 79개가 통과했다. 배포 빌드와 대상 TypeScript 전체 Prettier 검사도 통과했다.
- 검증은 모킹한 제공자와 임시 PGlite DB를 사용했다. 실제 외부 API·운영 DB·AWS 배포 확인을 대신하지 않는다. 검증용 도구는 저장소 밖에 보관한다.

## 6. 추가 경계값 검사 후 변경

[심화 검증 보고서](PLACE_ROUTING_TEST_REPORT_2026-10-26.md)에 재현한 문제와 수정 결과를 정리했다. 수집 조건 검사(assertIngestionOptions)는 CLI와 HTTP가 공유하며, tour-pagination.ts는 API 전체 건수에 비해 응답 행이 빠졌는지 확인한다. 수동 /run은 조건이 있는 본문 전체를 사용하고 잘못된 입력을 기본 전체 수집으로 바꾸지 않는다. 복합 요금은 원문을 보존하고 금액을 확정하지 않으며 ORS의 비어 있는 구간 시간도 거절한다. 최신 검증은 130개 통과다. 앞선 주석 정리의 235개 함수·46개 파일 기록은 해당 시점의 작업량이며 새 검증 함수/파일이 추가되었다.
