/**
 * 장소 수집 데이터 모양. API 원본은 unknown 필드 객체이며 변환 단계에서 내용을 검증한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
export type TourItem = Record<string, unknown>;
/** 호출할 수 있는 TourAPI 이름의 목록. 임의 URL을 외부 입력으로 받지 않는다. */
export type TourEndpoint =
  | 'lclsSystmCode2'
  | 'ldongCode2'
  | 'areaBasedList2'
  | 'locationBasedList2'
  | 'areaBasedSyncList2'
  | 'searchFestival2'
  | 'detailCommon2'
  | 'detailIntro2'
  | 'detailInfo2'
  | 'detailImage2';
/** TourAPI 쿼리 파라미터 이름→문자열/숫자 값. */
export type TourParams = Record<string, string | number>;
export interface TourPage {
  /** 현재 페이지의 원본 항목 배열. 데이터가 없으면 []. */
  items: TourItem[];
  /** API가 알려 준 전체 검색 결과 수. 현재 페이지 수와 다르다. */
  totalCount: number;
  /** API가 실제 반환한 페이지 번호. 1부터 시작한다. */
  pageNo: number;
  /** 인증키를 제거한 현재 페이지 요청 URL. */
  sourceUrl: string;
}
export interface TourCollection {
  /** 모든 조회 페이지를 이어 붙인 원본 항목 배열. */
  items: TourItem[];
  /** 각 페이지를 조회한 출처 URL 목록. 인증키는 포함하지 않는다. */
  sourceUrls: string[];
}
export interface CategoryInput {
  /** TourAPI 신분류 코드. 예: NA, NA04, NA040500. */
  code: string;
  /** 분류의 표시 이름. */
  name: string;
  /** 대분류=1, 중분류=2, 소분류=3. */
  level: number;
  /** 직계 상위 분류 코드. 대분류의 부모는 null. */
  parentCode: string | null;
}
export interface Snapshot {
  /** 해당 응답을 받은 UTC ISO 시각. 원본 modifiedtime과 다르다. */
  fetched_at: string;
  /** API가 반환한 원본 행 배열. 인증 필드는 저장 전에 제거한다. */
  items: TourItem[];
  /** 해당 API의 마지막 페이지 요청 URL. 인증키 제외. */
  source_url?: string;
  /** 여러 페이지를 조회했다면 페이지별 출처 URL. 인증키 제외. */
  source_urls?: string[];
}
/** API 이름별 마지막 성공 응답. 수집하지 않은 API는 속성이 없고 이전 이력은 누적하지 않는다. */
export type Snapshots = Partial<Record<TourEndpoint, Snapshot>>;
export interface References {
  /** 분류 코드 → 내부 category UUID와 단계(level) 사전. */
  categories: Map<string, { id: string; level: number }>;
  /** 시도 코드 → 시도명 사전. 예: "26" → "부산광역시". */
  regions: Map<string, string>;
  /** 시도:시군구 복합 키 → 시군구명 사전. 예: "26:380" → "사하구". */
  districts: Map<string, string>;
}
/** 신규 inserted / 내용 변경 updated / 내용 동일 unchanged. */
export type SaveStatus = 'inserted' | 'updated' | 'unchanged';
export interface SaveResult {
  /** 저장된 내부 place_id(UUID). TourAPI contentid와 다르다. */
  id: string;
  /** inserted=신규, updated=내용 변경, unchanged=내용 동일 재수집. */
  status: SaveStatus;
}

/**
 * 원본 JSON 값이 null과 배열을 제외한 객체인지 검사한다.
 *
 * 입력: value: 자료형을 아직 모르는 값.
 * @returns 객체이면 true. TypeScript가 이후 값을 TourItem으로 취급할 수 있다.
 * @example
 * record({ title: "공원" }); // true
 * record([]); // false
 */
export function record(value: unknown): value is TourItem {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
