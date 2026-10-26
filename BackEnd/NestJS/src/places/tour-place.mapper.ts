/**
 * 기존 장소 + 이번 응답 병합 담당. 없는 필드는 보존하고 내용 변경과 단순 재수집을 구분한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { basicPatch, detailPatch, imagePatch } from './tour-mapping';
import { sanitize, sourceUrl } from './tour-provenance';
import type { PlaceMapper, PreparedPlace } from './tour-ingestion.ports';
import type { References, Snapshots, TourItem } from './tour-types';

/** DB INSERT에 사용하는 고정 컬럼 순서. API 입력으로 컬럼 이름을 바꾸지 않는다. */
export const PLACE_FIELDS = [
  'content_id',
  'content_type_id',
  'name',
  'description',
  'address',
  'address_detail',
  'latitude',
  'longitude',
  'region_code',
  'region_name',
  'district_code',
  'district_name',
  'category_id',
  'phone',
  'website_url',
  'opening_hours',
  'closed_days',
  'main_image_url',
  'images',
  'fee_text',
  'fees',
  'event_start_date',
  'event_end_date',
  'source_updated_at',
  'is_active',
  'source_url',
  'source_type',
];

/**
 * 객체 속성 순서 차이를 없앤 JSON 비교 문자열을 만든다.
 *
 * 입력: value: 날짜·배열·객체 등을 포함한 비교 값.
 * @returns 키를 정렬하고 Date를 ISO로 변환한 JSON 문자열.
 * @example
 * stable({ b: 2, a: 1 }); // "{\"a\":1,\"b\":2}"
 *
 * 배열 원소 순서는 유지한다. DB를 읽거나 쓰지 않는 비교용 함수다.
 */
function stable(value: unknown): string {
  /**
   * 변경 여부 비교를 위해 날짜·배열·객체를 재귀적으로 정리한다.
   *
   * 입력: item: 비교할 값.
   * @returns Date는 ISO 문자열, 객체는 정렬된 키와 정리한 값, 배열은 같은 순서의 배열.
   * @example
   * normalize(new Date("2026-10-26T00:00:00Z")); // "2026-10-26T00:00:00.000Z"
   */
  const normalize = (item: unknown): unknown => {
    if (item instanceof Date) return item.toISOString();
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(
            /**
             * 비교용 객체의 키를 문자열 순으로 정렬한다.
             *
             * 입력: [a], [b]: 두 속성의 키. 값은 정렬에 사용하지 않는다.
             * @returns localeCompare 결과 숫자.
             * @example
             * // "a" 키는 "b" 키보다 앞에 정렬
             */
            ([a], [b]) => a.localeCompare(b),
          )
          .map(
            /**
             * 객체의 키는 유지하고 값은 재귀적으로 정리한다.
             *
             * 입력: [k,v]: 객체 속성의 키·값.
             * @returns [k,normalize(v)] 쌍.
             * @example
             * // ["day",Date] → ["day",ISO 문자열]
             */
            ([k, v]) => [k, normalize(v)],
          ),
      );
    return item;
  };
  return JSON.stringify(normalize(value));
}

/**
 * 장소 행을 내용 비교에 사용할 컬럼과 값으로 정리한다.
 *
 * 입력: row: 기존 DB 행 또는 새 장소 객체.
 * @returns 출처 URL·수집 방식은 제외하고 숫자·날짜 표현을 맞춘 객체.
 * @example
 * // latitude="35.1"과 latitude=35.1은 정리 후 동일한 숫자로 비교
 *
 * 수집 시각·URL만 바뀌었다고 장소 내용 변경으로 세지 않기 위한 준비 단계다.
 */
function comparable(row: TourItem): TourItem {
  const data = Object.fromEntries(
    PLACE_FIELDS.filter(
      /**
       * 내용 비교에서 출처 메타정보를 제외한다.
       *
       * 입력: key: 장소 컬럼명.
       * @returns source_url/source_type이면 false, 그 외 true.
       * @example
       * // "source_url" → false, "name" → true
       */
      (key) => !['source_url', 'source_type'].includes(key),
    ).map(
      /**
       * 내용 비교에 쓸 컬럼·값 쌍을 만들고 미정의 값은 null로 맞춘다.
       *
       * 입력: key: 비교 컬럼명. 바깥 row에서 값을 읽는다.
       * @returns [key,값] 쌍.
       * @example
       * // row.phone이 undefined → ["phone",null]
       */
      (key) => [key, row[key] ?? null],
    ),
  );
  for (const key of ['latitude', 'longitude'])
    if (data[key] !== null) data[key] = Number(data[key]);
  for (const key of [
    'source_updated_at',
    'event_start_date',
    'event_end_date',
  ]) {
    const value = data[key];
    if (!value) continue;
    // DB 날짜는 Date 또는 문자열이다. 객체를 강제로 문자열로 바꿔 잘못된 비교를 하지 않는다.
    if (typeof value !== 'string' && !(value instanceof Date)) {
      throw new Error('Invalid stored place date');
    }
    const dateText = value instanceof Date ? value.toISOString() : value;
    data[key] =
      key === 'source_updated_at'
        ? new Date(dateText).toISOString()
        : dateText.slice(0, 10);
  }
  return data;
}
export class TourPlaceMapper implements PlaceMapper {
  /**
   * 스냅샷의 API 종류를 판단해 기본 컬럼 패치를 만든다.
   *
   * 입력: item: 원본 장소, fresh: 이번 API 응답, refs: 분류·지역 사전.
   * @returns 기본 컬럼 패치. DB 쓰기는 수행하지 않는다.
   * @example
   * // fresh.detailCommon2가 있으면 detailCommon2 기준으로 basicPatch 호출
   */
  basic(item: TourItem, fresh: Snapshots, refs: References): TourItem {
    const endpoint = fresh.detailCommon2
      ? 'detailCommon2'
      : (Object.keys(fresh)[0] as keyof Snapshots);
    return basicPatch(item, refs, endpoint);
  }

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
  ): PreparedPlace {
    const safeFresh = sanitize(fresh) as Snapshots;
    // HTTP 단계뿐 아니라 DB 저장 직전에도 스냅샷 URL의 인증정보를 제거한다.
    for (const snapshot of Object.values(safeFresh)) {
      if (snapshot.source_url)
        snapshot.source_url = sourceUrl(snapshot.source_url);
      if (snapshot.source_urls)
        snapshot.source_urls = snapshot.source_urls.map(sourceUrl);
    }
    const raw = { ...(old?.raw_data as Snapshots), ...safeFresh };
    const next: TourItem = {
      images: [],
      fees: [],
      is_active: true,
      ...old,
      ...patch,
    };
    const latest = Object.values(safeFresh).at(-1);
    next.source_url = latest?.source_url ?? old?.source_url ?? null;
    next.source_type = 'API';
    if (fresh.detailIntro2 || fresh.detailInfo2)
      Object.assign(next, detailPatch(Number(next.content_type_id), raw));
    Object.assign(next, imagePatch(next, raw));

    /**
     * 스냅샷에서 수집 시각과 URL을 빼고 응답 내용만 비교한다.
     *
     * 입력: data: API 이름별 스냅샷 객체.
     * @returns API 이름→items 배열인 객체.
     * @example
     * contentOf({ detailCommon2: { fetched_at: "예시", items: [{ title: "공원" }] } }); // { detailCommon2: [{ title: "공원" }] }
     */
    const contentOf = (data: Snapshots) =>
      Object.fromEntries(
        Object.entries(data).map(
          /**
           * 스냅샷 항목만 남겨 수집 시각·URL 차이를 제외한다.
           *
           * 입력: [key,value]: API 이름과 스냅샷.
           * @returns [API 이름,items] 쌍.
           * @example
           * // ["detailImage2",snapshot] → ["detailImage2",snapshot.items]
           */
          ([key, value]) => [key, value.items],
        ),
      );
    const changed =
      !old ||
      stable(comparable(old)) !== stable(comparable(next)) ||
      stable(contentOf((old.raw_data as Snapshots) ?? {})) !==
        stable(contentOf(raw));
    return { next, raw, changed };
  }
}
