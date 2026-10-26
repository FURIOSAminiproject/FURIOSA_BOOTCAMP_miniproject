/**
 * 장소 수집 각 담당의 입력·출력 계약. interface는 실제 실행 코드가 아니라 구현이 지켜야 할 약속이다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { IngestionOptions } from './tour-ingestion.options';
import type {
  CategoryInput,
  References,
  SaveResult,
  Snapshots,
  TourCollection,
  TourEndpoint,
  TourItem,
  TourPage,
  TourParams,
} from './tour-types';

// 호출하는 쪽은 필요한 기능만 받는다. 실제 구현 연결은 Nest 모듈에서 한다.
export interface PageReader {
  /**
   * TourAPI 한 페이지를 호출하고 응답 구조를 검사한다.
   *
   * 입력: endpoint: 허용된 API 이름, params: 페이지·지역·장소 등의 쿼리. 공통 인증·앱 파라미터는 내부에서 추가한다.
   * @returns items, totalCount, pageNo, 인증키를 제거한 sourceUrl.
   * @example
   * await api.page("areaBasedList2", { lDongRegnCd: "26", pageNo: 1, numOfRows: 20 });
   *
   * 요청 예산·호출 간격을 지킨다. HTTP 5xx만 한 번 재시도하며 네트워크/형식 오류는 예외로 알린다.
   */
  page(endpoint: TourEndpoint, params?: TourParams): Promise<TourPage>;
}
export interface ReferenceReader {
  /**
   * 해당 API의 모든 페이지에서 항목만 모은다.
   *
   * 입력: endpoint: API 이름, params: 조회 조건. 페이지 번호와 페이지 크기는 내부에서 정한다.
   * @returns 모든 TourItem의 배열. 데이터가 없으면 빈 배열.
   * @example
   * await api.all("ldongCode2", { lDongListYn: "N" }); // 지역 코드 목록
   *
   * 실제 HTTP 요청이 여러 번 발생할 수 있으며 최대 100페이지 제한이 있다.
   */
  all(endpoint: TourEndpoint, params?: TourParams): Promise<TourItem[]>;
}
export interface DetailReader extends PageReader {
  /**
   * 여러 페이지의 항목과 페이지별 출처 URL을 함께 모은다.
   *
   * 입력: endpoint: API 이름, params: 조회 조건.
   * @returns {items, sourceUrls}. 모든 페이지를 수집하지 못하면 부분 결과 대신 예외.
   * @example
   * await api.allWithSources("detailImage2", { contentId: "126128", imageYN: "Y" });
   *
   * 페이지당 100건, 최대 100페이지. URL에서 인증키를 제거한다.
   */
  allWithSources(
    endpoint: TourEndpoint,
    params?: TourParams,
  ): Promise<TourCollection>;
}
export interface RequestMetrics {
  /** 클라이언트 생성 이후 HTTP 요청 시도 수. 재시도도 한 번으로 센다. */
  readonly requests: number;
}
export interface IngestionGate {
  /**
   * DB 잠금을 잡은 동안 하나의 장소 수집만 실행한다.
   *
   * 입력: work: 잠금 확보 후 실행할 비동기 함수.
   * @returns work가 반환한 값 T. 이미 수집 중이면 INGESTION_ALREADY_RUNNING 예외.
   * @example
   * await session.withLock(async () => "수집 완료"); // "수집 완료"
   *
   * 전용 연결에 advisory lock을 잡고 finally에서 잠금과 연결을 해제한다. 전체 수집을 하나의 트랜잭션으로 묶지는 않는다.
   */
  withLock<T>(work: () => Promise<T>): Promise<T>;

  /**
   * 장소 수집에 필요한 v2 테이블의 존재와 컬럼 수를 확인한다.
   *
   * 입력: 인자 없음. 현재 DB 스키마의 information_schema를 읽는다.
   * @returns 정상이면 Promise<void>, 예상과 다르면 SCHEMA_V2_REQUIRED 예외.
   * @example
   * await session.assertSchema(); // place_categories=5, places=32, place_reviews=7 컬럼 확인
   *
   * 테이블을 만들거나 변경하지 않는다. 컬럼 수 확인이므로 이름·자료형·접근 권한 전체 검증은 아니다.
   */
  assertSchema(): Promise<void>;
}
export interface CategoryWriter {
  /**
   * 대·중·소분류를 부모부터 DB에 저장하고 코드별 내부 ID를 돌려준다.
   *
   * 입력: entries: code/name/level/parentCode가 있는 분류 목록.
   * @returns 분류 코드 → {id: 내부 UUID, level: 단계}인 Map.
   * @example
   * await repository.categories([{ code: "NA", name: "자연", level: 1, parentCode: null }]);
   *
   * 한 트랜잭션에서 단계 1→2→3 순서로 저장한다. 같은 code의 기존 UUID는 유지한다.
   */
  categories(entries: CategoryInput[]): Promise<References['categories']>;
}
export interface PlaceWriter {
  /**
   * 외부 장소 ID(content_id)를 기준으로 장소 한 건을 저장한다.
   *
   * 입력: item: 원본 행, fresh: 이번 수집 스냅샷, refs: 분류·지역 사전.
   * @returns {id: 내부 place UUID, status: inserted/updated/unchanged}.
   * @example
   * // 동일 contentid의 첫 저장 → inserted, 이름 변경 → updated, 내용 동일 → unchanged
   *
   * 기존 행을 잠그고 매핑 후 UPSERT한다. 기존 UUID는 유지하며 내용 변경 때만 updated_at을 갱신한다. last_synced_at은 저장할
   * 때 갱신한다.
   */
  save(item: TourItem, fresh: Snapshots, refs: References): Promise<SaveResult>;
}
export interface ReferenceContext {
  /** 현재 수집 실행에서 공유하는 분류·지역 사전. */
  refs: References;
  /** 이번 기준정보 로딩에서 준비한 분류 수. */
  categoryCount: number;

  /**
   * 장소의 시도에 해당하는 시군구 코드명을 실행 중 한 번만 읽는다.
   *
   * 입력: item: lDongRegnCd가 있는 원본 장소. refs와 loadedRegions를 바깥에서 사용한다.
   * @returns Promise<void>. refs.districts와 조회 완료 지역 Set을 채운다.
   * @example
   * // lDongRegnCd="26" → 키 "26:380" 등에 시군구명 저장
   *
   * 잘못된 지역 코드는 조회하지 않는다. API 조회 성공 후에만 지역을 완료로 표시한다.
   */
  ensureDistrict(item: TourItem): Promise<void>;
}
export interface ReferenceLoader {
  /**
   * 한 번의 수집에 사용할 분류·시도 기준정보와 시군구 조회 함수를 준비한다.
   *
   * 입력: 인자 없음. 주입받은 API 조회기와 분류 저장기를 사용한다.
   * @returns refs, categoryCount, ensureDistrict를 포함한 ReferenceContext.
   * @example
   * const context = await references.load(); // 분류 DB 저장 + 시도 목록 준비
   *
   * 분류 API·지역 API를 호출하고 분류를 저장한다. 시군구 목록은 해당 지역 장소를 처음 만났을 때만 읽는다.
   */
  load(): Promise<ReferenceContext>;
}
export interface DetailLoader {
  /**
   * 한 장소의 공통·소개·반복·이미지 상세 응답을 모은다.
   *
   * 입력: contentId: TourAPI의 외부 장소 ID 문자열.
   * @returns 공통 item과 API별 수집 시각·응답·출처 URL인 snapshots.
   * @example
   * await details.load("126128"); // { item: 공통 정보, snapshots: 상세 응답 묶음 }
   *
   * 공통 정보 후 나머지 세 종류의 모든 페이지를 조회한다. 하나라도 실패하면 완성되지 않은 묶음을 반환하지 않으며 여기서는 DB에 쓰지 않는다.
   */
  load(contentId: string): Promise<{ item: TourItem; snapshots: Snapshots }>;
}
export interface ListPlan {
  /** 호출할 TourAPI 목록 이름. */
  endpoint: TourEndpoint;
  /** 모든 파티션에 공통으로 적용할 API 쿼리. */
  params: TourParams;
  /** 나눠서 조회할 목록. 예: 증분 showflag=1/0을 별도 페이지로 진행. */
  partitions: { key: string; params: TourParams }[];
}
export interface ListPlanResolver {
  /**
   * 수집 모드에 등록된 목록 조회 전략을 선택한다.
   *
   * 입력: options: mode 및 조회 조건.
   * @returns endpoint, params, partitions가 있는 조회 계획.
   * @example
   * plans.resolve({ mode: "sync", modifiedSince: "20261024", ...options }); // showflag=1/0 분리
   *
   * 등록하지 않은 mode는 Error. 새 목록 모드는 전략을 추가해 연결한다.
   */
  resolve(options: IngestionOptions): ListPlan;
}
export interface PreparedPlace {
  /** 기존 행과 새 응답을 합친 저장 대상 장소 컬럼. */
  next: TourItem;
  /** API별 최신 응답 스냅샷. 과거 수집 이력 배열이 아니다. */
  raw: Snapshots;
  /** 출처 메타정보만 달라진 경우를 제외한 실제 내용 변경 여부. */
  changed: boolean;
}
export interface PlaceMapper {
  /**
   * 스냅샷의 API 종류를 판단해 기본 컬럼 패치를 만든다.
   *
   * 입력: item: 원본 장소, fresh: 이번 API 응답, refs: 분류·지역 사전.
   * @returns 기본 컬럼 패치. DB 쓰기는 수행하지 않는다.
   * @example
   * // fresh.detailCommon2가 있으면 detailCommon2 기준으로 basicPatch 호출
   */
  basic(item: TourItem, fresh: Snapshots, refs: References): TourItem;

  /**
   * 기존 장소와 새 응답을 합치고 실제 내용 변경 여부를 계산한다.
   *
   * 입력: old: 기존 행 또는 undefined, patch: 기본 컬럼 변경분, fresh: 이번에 성공한 API 스냅샷.
   * @returns next: 저장할 장소, raw: API별 최신 응답, changed: 내용 변경 여부.
   * @example
   * // 같은 장소 내용에 fetched_at만 달라지면 changed=false
   * // 이름이 달라지면 changed=true
   *
   * API별 과거 이력을 쌓지 않고 최신 스냅샷을 덮는다. 저장 직전에 인증정보를 한 번 더 제거한다.
   */
  merge(
    old: TourItem | undefined,
    patch: TourItem,
    fresh: Snapshots,
  ): PreparedPlace;
}
export interface IngestionDependencies {
  /** 목록 페이지 조회와 요청 수 측정에 필요한 기능. */
  api: PageReader & RequestMetrics;
  /** 수집 중복 잠금과 스키마 검사 기능. */
  gate: IngestionGate;
  /** 분류·지역 기준정보 준비 기능. */
  references: ReferenceLoader;
  /** 한 장소의 상세 응답 묶음 조회 기능. */
  details: DetailLoader;
  /** 기본/상세 장소 DB 저장 기능. */
  places: PlaceWriter;
  /** 수집 옵션을 목록 API 계획으로 바꾸는 기능. */
  plans: ListPlanResolver;
}
