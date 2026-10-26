/**
 * TourAPI 필드를 장소 컬럼으로 바꾸는 순수 변환 함수. 여기서는 HTTP·DB 작업을 하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type {
  CategoryInput,
  References,
  Snapshots,
  TourItem,
  TourEndpoint,
} from './tour-types';
import { MappingError } from './tour-errors';
export { MappingError } from './tour-errors';
export type {
  CategoryInput,
  Snapshot,
  Snapshots,
  References,
} from './tour-types';

/** 관광지·문화시설·행사·레포츠·숙박·쇼핑·음식점 타입만 장소 수집 대상으로 삼는다. */
export const CONTENT_TYPES = [12, 14, 15, 28, 32, 38, 39];
export interface Fee {
  /** 요금 이름. 예: 입장료, 주차요금. */
  label: string;
  /** 금액 해석과 관계없이 보존하는 원문. */
  text: string;
  /** 확정적으로 읽을 수 있는 원 단위 금액. 불명확하면 null, 명시된 무료는 0. */
  amount: number | null;
  /** person=1인, vehicle=차량, room_night=객실 1박 등. 알 수 없으면 null. */
  unit: string | null;
}

/**
 * 문자열·숫자를 앞뒤 공백이 없는 문자열로 정리한다.
 *
 * 입력: value: API 필드의 원본 값.
 * @returns 앞뒤 공백을 제거한 문자열. 빈 값·객체·배열·불리언은 null.
 * @example
 * text("  부산  "); // "부산"
 * text(0); // "0"
 * text(""); // null
 */
export function text(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = String(value).trim();
  return result || null;
}

/**
 * API 설명에서 HTML 태그와 일부 엔티티를 제거한다.
 *
 * 입력: value: 설명 문자열 또는 숫자. br 태그는 줄바꿈으로 바꾼다.
 * @returns 표시용 일반 문자열, 내용이 없으면 null.
 * @example
 * plain("<p>공원<br>무료</p>"); // "공원\n무료"
 *
 * 정규식 기반의 제한된 텍스트 정리다. 이 반환값을 다시 HTML로 해석하지 않는다.
 */
export function plain(value: unknown): string | null {
  const s = text(value);
  return s
    ? s
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .trim() || null
    : null;
}

/**
 * 일반 URL 또는 링크 태그에서 http/https 주소를 추출한다.
 *
 * 입력: value: URL 문자열 또는 href가 있는 문자열.
 * @returns 정상화된 URL 문자열. 빈 값·파싱 실패·다른 프로토콜은 null.
 * @example
 * httpUrl('<a href="https://example.com">홈</a>'); // "https://example.com/"
 */
export function httpUrl(value: unknown): string | null {
  const s = text(value);
  if (!s) return null;
  const candidate = s.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? s;
  try {
    const url = new URL(candidate.replace(/&amp;/gi, '&'));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * 8자리 날짜가 실제 달력 날짜인지 검사한다.
 *
 * 입력: value: YYYYMMDD 문자열 또는 숫자.
 * @returns YYYY-MM-DD 문자열. 형식 오류·존재하지 않는 날짜는 null.
 * @example
 * dateValue("20261026"); // "2026-10-26"
 * dateValue("20260230"); // null
 */
export function dateValue(value: unknown): string | null {
  const s = text(value);
  if (!s || !/^\d{8}$/.test(s)) return null;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

/**
 * TourAPI의 한국 시간 수정일을 UTC 시각으로 바꾼다.
 *
 * 입력: value: YYYYMMDDHHmmss 형식의 한국 시간.
 * @returns UTC ISO 문자열. 잘못된 날짜·시각이면 null.
 * @example
 * sourceTime("20261026010000"); // "2026-10-25T16:00:00.000Z"
 *
 * source_updated_at은 원본 수정 시각이다. 서버가 수집한 시각과 구분한다.
 */
export function sourceTime(value: unknown): string | null {
  const s = text(value);
  if (!s || !/^\d{14}$/.test(s) || !dateValue(s.slice(0, 8))) return null;
  if (+s.slice(8, 10) > 23 || +s.slice(10, 12) > 59 || +s.slice(12) > 59)
    return null;
  return new Date(
    `${dateValue(s.slice(0, 8))}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12)}+09:00`,
  ).toISOString();
}

/**
 * 신분류 응답을 부모 코드가 연결된 1~3단계 분류 목록으로 바꾼다.
 *
 * 입력: items: lclsSystm1/2/3Cd와 Nm 필드가 있는 API 행 배열.
 * @returns 코드 중복을 정리하고 상위 단계부터 정렬한 CategoryInput 배열.
 * @example
 * categoriesFrom([{ lclsSystm1Cd: "NA", lclsSystm1Nm: "자연" }]); // level=1, parentCode=null
 *
 * 잘못된 계층·충돌하는 코드·빈 분류 응답은 MappingError다.
 */
export function categoriesFrom(items: TourItem[]): CategoryInput[] {
  const map = new Map<string, CategoryInput>();
  for (const item of items) {
    let parentCode: string | null = null;
    for (const level of [1, 2, 3]) {
      const code = text(item[`lclsSystm${level}Cd`]);
      const name = text(item[`lclsSystm${level}Nm`]);
      if (!code && !name) {
        parentCode = null;
        continue;
      }
      if (
        !code ||
        !/^[A-Z0-9]{1,30}$/.test(code) ||
        !name ||
        name.length > 100 ||
        (level > 1 && !parentCode)
      ) {
        throw new MappingError('Invalid category hierarchy');
      }
      const entry = { code, name, level, parentCode };
      const previous = map.get(code);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry))
        throw new MappingError('Conflicting category code');
      map.set(code, entry);
      parentCode = code;
    }
  }
  if (!map.size) throw new MappingError('Empty category reference');
  return [...map.values()].sort(
    /**
     * 분류를 부모 단계가 먼저 나오도록 정렬한다.
     *
     * 입력: a, b: 비교할 분류 두 건.
     * @returns a.level-b.level. 음수이면 a가 앞에 온다.
     * @example
     * // a.level=1, b.level=3 → -2
     */
    (a, b) => a.level - b.level,
  );
}

/**
 * 지역 코드 응답을 코드→한글명 Map으로 바꾼다.
 *
 * 입력: items: code와 name이 있는 API 행 배열.
 * @returns Map<string, string>. 잘못된 코드·이름은 MappingError.
 * @example
 * codeNames([{ code: "26", name: "부산광역시" }]).get("26"); // "부산광역시"
 */
export function codeNames(items: TourItem[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const row of items) {
    const code = text(row.code),
      name = text(row.name);
    if (!code || !name || name.length > 100)
      throw new MappingError('Invalid region reference');
    result.set(code, name);
  }
  return result;
}

/**
 * TourAPI 문자열 좌표를 places 컬럼 순서로 변환한다.
 *
 * 입력: item: mapx=경도, mapy=위도가 있는 원본 장소.
 * @returns [위도, 경도]. 유효하지 않거나 둘 다 0이면 [null, null]. 소수 7자리로 반올림한다.
 * @example
 * coordinates({ mapx: "128.9459775", mapy: "35.1044927" }); // [35.1044927, 128.9459775]
 *
 * ORS/GeoJSON 배열은 반대로 [경도, 위도]이므로 혼동하지 않는다.
 */
function coordinates(item: TourItem): [number | null, number | null] {
  const x = text(item.mapx),
    y = text(item.mapy);
  const lon = x ? Number(x) : NaN,
    lat = y ? Number(y) : NaN;
  return Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    Math.abs(lon) <= 180 &&
    Math.abs(lat) <= 90 &&
    !(lon === 0 && lat === 0)
    ? [Number(lat.toFixed(7)), Number(lon.toFixed(7))]
    : [null, null];
}

/**
 * 목록·공통 응답을 places에 반영할 기본 컬럼으로 바꾼다.
 *
 * 입력: item: 원본 장소, refs: 코드→내부 ID/이름 사전, endpoint: 응답 API 이름.
 * @returns 실제로 반영할 컬럼만 가진 TourItem 객체.
 * @example
 * // item.contentid="126128", title="동촌유원지", contenttypeid="12"
 * // → content_id="126128", name="동촌유원지", content_type_id=12
 *
 * 응답에 없는 필드는 패치에서 제외해 기존 상세값을 보존한다. 빈 대표 이미지는 기존 이미지를 지우지 않는다. 증분 showflag=0은 비활성화다.
 */
export function basicPatch(
  item: TourItem,
  refs: References,
  endpoint: TourEndpoint,
): TourItem {
  const id = text(item.contentid),
    name = plain(item.title),
    type = Number(item.contenttypeid);
  if (
    !id ||
    !/^\d{1,30}$/.test(id) ||
    !name ||
    name.length > 255 ||
    !CONTENT_TYPES.includes(type)
  )
    throw new MappingError('Invalid place identity');
  const patch: TourItem = { content_id: id, name, content_type_id: type };
  for (const [source, target] of [
    ['addr1', 'address'],
    ['addr2', 'address_detail'],
    ['tel', 'phone'],
    ['overview', 'description'],
  ]) {
    if (Object.hasOwn(item, source)) patch[target] = plain(item[source]);
  }
  if (Object.hasOwn(item, 'homepage'))
    patch.website_url = httpUrl(item.homepage);
  // 목록의 이미지가 비어 있어도 이미 저장한 대표 이미지를 지우지 않는다.
  if (httpUrl(item.firstimage)) patch.main_image_url = httpUrl(item.firstimage);
  if (Object.hasOwn(item, 'mapx') || Object.hasOwn(item, 'mapy'))
    [patch.latitude, patch.longitude] = coordinates(item);
  if (Object.hasOwn(item, 'lDongRegnCd')) {
    const code = text(item.lDongRegnCd);
    patch.region_code = code && /^\d{2}$/.test(code) ? code : null;
    patch.region_name =
      typeof patch.region_code === 'string'
        ? (refs.regions.get(patch.region_code) ?? null)
        : null;
  }
  if (Object.hasOwn(item, 'lDongSignguCd')) {
    const code = text(item.lDongSignguCd),
      region = text(item.lDongRegnCd);
    patch.district_code = region && code && /^\d{3}$/.test(code) ? code : null;
    patch.district_name = patch.district_code
      ? (refs.districts.get(`${region}:${code}`) ?? null)
      : null;
  }
  if (patch.region_code === null) {
    patch.district_code = null;
    patch.district_name = null;
  }
  if (Object.hasOwn(item, 'lclsSystm3')) {
    const category = refs.categories.get(text(item.lclsSystm3) ?? '');
    patch.category_id = category?.level === 3 ? category.id : null;
  }
  const modified = sourceTime(item.modifiedtime);
  if (modified) patch.source_updated_at = modified;
  if (endpoint === 'areaBasedSyncList2') {
    if (!['0', '1'].includes(String(item.showflag)))
      throw new MappingError('Invalid showflag');
    patch.is_active = String(item.showflag) === '1';
  }
  if (endpoint === 'searchFestival2') {
    patch.event_start_date = dateValue(item.eventstartdate);
    patch.event_end_date = dateValue(item.eventenddate);
    if (
      patch.event_start_date &&
      patch.event_end_date &&
      patch.event_end_date < patch.event_start_date
    ) {
      patch.event_start_date = null;
      patch.event_end_date = null;
    }
  }
  return patch;
}
const introFields: Record<number, [string, string | null]> = {
  12: ['usetime', 'restdate'],
  14: ['usetimeculture', 'restdateculture'],
  15: ['playtime', null],
  28: ['usetimeleports', 'restdateleports'],
  32: ['checkintime', null],
  38: ['opentime', 'restdateshopping'],
  39: ['opentimefood', 'restdatefood'],
};

/**
 * 요금 설명을 보존하면서 명확한 금액만 숫자로 추출한다.
 *
 * 입력: label: 요금명, value: 원문, unit: person/vehicle 등 단위 또는 null.
 * @returns {label, text, amount, unit}. 빈 설명이면 null, 금액이 모호하면 amount=null.
 * @example
 * fee("입장료", "성인 5,000원"); // amount=5000, unit="person"
 * fee("체험료", "5,000원부터", "person"); // amount=null
 *
 * 정확히 무료라고 쓰인 경우 amount=0. 유료·무료 조건 혼합, 가격 범위·할인·여러 가격은 단일 금액으로 추정하지 않는다.
 */
function fee(
  label: string,
  value: unknown,
  unit: string | null = null,
): Fee | null {
  const content = plain(value);
  if (!content) return null;
  let amount: number | null = null;
  if (/^무료[.!]?$/.test(content)) amount = 0;
  else {
    const prices = [...content.matchAll(/([\d,]+)\s*원/g)];
    if (!unit && /1인|성인|청소년|어린이/.test(content)) unit = 'person';
    if (
      unit &&
      prices.length === 1 &&
      !/무료/.test(content) &&
      !/부터|이상|이하|최소|최대|할인|~|∼|\d\s*[-–]/.test(content)
    ) {
      const n = Number(prices[0][1].replaceAll(',', ''));
      if (Number.isSafeInteger(n) && n >= 0) amount = n;
    }
  }
  return { label, text: content, amount, unit };
}

/**
 * 관광 타입별 상세 필드를 공통 영업시간·휴무·요금 컬럼으로 바꾼다.
 *
 * 입력: type: 관광 타입 번호, snapshots: 소개·반복 응답을 포함한 최신 API 묶음.
 * @returns opening_hours, closed_days, fees, fee_text 중 수집된 상세에 해당하는 패치.
 * @example
 * // type=12, detailIntro2.items=[{usetime:"상시 개방",restdate:"연중무휴"}]
 * // → opening_hours="상시 개방", closed_days="연중무휴"
 *
 * 숙박 요금의 0을 무료로 단정하지 않는다. 식당 메뉴 설명으로 식사비를 추정하지 않는다.
 */
export function detailPatch(type: number, snapshots: Snapshots): TourItem {
  const patch: TourItem = {};
  const intro = snapshots.detailIntro2?.items[0];
  if (intro) {
    const [hours, closed] = introFields[type];
    patch.opening_hours =
      type === 32
        ? [
            plain(intro.checkintime) && `입실 ${plain(intro.checkintime)}`,
            plain(intro.checkouttime) && `퇴실 ${plain(intro.checkouttime)}`,
          ]
            .filter(Boolean)
            .join(' / ') || null
        : plain(intro[hours]);
    patch.closed_days = closed ? plain(intro[closed]) : null;
  }
  const fees: Fee[] = [];

  /**
   * 읽을 수 있는 요금 설명 하나를 현재 장소의 fees 배열에 추가한다.
   *
   * 입력: label: 요금명, value: 원문, unit: 선택적 기준 단위. 바깥의 fees 배열을 사용한다.
   * @returns 없음(void). fee() 결과가 null이 아닐 때만 배열에 넣는다.
   * @example
   * add("주차요금", "3,000원", "vehicle"); // fees에 amount=3000 추가
   */
  const add = (label: string, value: unknown, unit: string | null = null) => {
    const f = fee(label, value, unit);
    if (f) fees.push(f);
  };
  if (intro) {
    const fields: Record<number, string> = {
      14: 'usefee',
      15: 'usetimefestival',
      28: 'usefeeleports',
    };
    if (fields[type]) add('이용요금', intro[fields[type]]);
    if (type === 14) add('주차요금', intro.parkingfee, 'vehicle');
    if (type === 28) add('주차요금', intro.parkingfeeleports, 'vehicle');
  }
  for (const item of snapshots.detailInfo2?.items ?? []) {
    if (type === 32) {
      for (const [field, label] of [
        ['roomoffseasonminfee1', '비수기 주중'],
        ['roomoffseasonminfee2', '비수기 주말'],
        ['roompeakseasonminfee1', '성수기 주중'],
        ['roompeakseasonminfee2', '성수기 주말'],
      ]) {
        const value = text(item[field]);
        if (value && /^\d+$/.test(value)) {
          const amount = Number(value);
          fees.push({
            label: `${plain(item.roomtitle) ?? '객실'} ${label} 최소 요금`,
            text: `${value}원`,
            amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null,
            unit: 'room_night',
          });
        }
      }
    } else {
      const label = plain(item.infoname);
      if (
        label &&
        /입장료|이용료|이용요금|체험료|주차료|주차요금/.test(
          label.replace(/\s/g, ''),
        )
      ) {
        add(
          label,
          item.infotext,
          /주차/.test(label)
            ? 'vehicle'
            : /입장료/.test(label.replace(/\s/g, ''))
              ? 'person'
              : null,
        );
      }
    }
  }
  if (snapshots.detailIntro2 || snapshots.detailInfo2) {
    patch.fees = fees;
    patch.fee_text =
      fees
        .map(
          /**
           * 요금 한 건을 사람이 읽을 수 있는 한 줄로 만든다.
           *
           * 입력: f: label과 text가 있는 요금.
           * @returns "요금명: 원문" 문자열.
           * @example
           * // {label:"입장료",text:"무료"} → "입장료: 무료"
           */
          (f) => `${f.label}: ${f.text}`,
        )
        .join('\n') || null;
  }
  return patch;
}

/**
 * 상세 이미지와 대표 이미지를 URL 기준으로 합친다.
 *
 * 입력: place: 현재 장소 컬럼, raw: API별 최신 스냅샷.
 * @returns 중복 없는 images 배열과 main_image_url. 이미지가 전혀 없으면 대표 URL=null.
 * @example
 * // main_image_url과 originimgurl이 같으면 images에는 한 번만 저장
 *
 * 대표 이미지가 있으면 유지한다. 추가할 대표 이미지의 메타정보는 최신 수집 응답부터 찾는다.
 */
export function imagePatch(place: TourItem, raw: Snapshots): TourItem {
  const images = new Map<string, TourItem>();
  for (const item of raw.detailImage2?.items ?? []) {
    const url = httpUrl(item.originimgurl);
    if (url)
      images.set(url, {
        url,
        thumbnail_url: httpUrl(item.smallimageurl),
        copyright_code: text(item.cpyrhtDivCd),
        attribution: null,
      });
  }
  const main = httpUrl(place.main_image_url);
  if (main && !images.has(main)) {
    const sources = Object.values(raw).sort(
      /**
       * 대표 이미지의 원본을 찾기 위해 최신 수집 응답부터 정렬한다.
       *
       * 입력: a, b: fetched_at ISO 문자열이 있는 스냅샷.
       * @returns 최신 시각이 앞에 오도록 하는 비교 숫자.
       * @example
       * // 10월 26일 응답은 10월 25일 응답보다 앞에 위치
       */
      (a, b) => b.fetched_at.localeCompare(a.fetched_at),
    );
    const original = sources
      .flatMap(
        /**
         * 스냅샷마다 들어 있는 이미지 후보 항목을 꺼낸다.
         *
         * 입력: s: API 응답 스냅샷 한 개.
         * @returns s.items 배열. flatMap이 여러 배열을 하나로 합친다.
         * @example
         * // items=[행1,행2] → 두 행이 전체 후보 목록에 포함
         */
        (s) => s.items,
      )
      .find(
        /**
         * 대표 이미지 주소와 같은 원본 항목을 찾는다.
         *
         * 입력: item: 원본 장소 행. 바깥 main은 대표 이미지 URL이다.
         * @returns 정상화한 firstimage가 main과 같으면 true.
         * @example
         * // firstimage와 main이 같은 https 이미지 주소 → true
         */
        (item) => httpUrl(item.firstimage) === main,
      );
    images.set(main, {
      url: main,
      thumbnail_url: httpUrl(original?.firstimage2),
      copyright_code: text(original?.cpyrhtDivCd),
      attribution: null,
    });
  }
  return {
    images: [...images.values()],
    main_image_url: main ?? images.keys().next().value ?? null,
  };
}
