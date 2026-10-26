/**
 * 분류·시도·시군구 코드명 준비 담당. 시군구는 실행 중 필요한 지역만 한 번씩 조회한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type {
  CategoryWriter,
  ReferenceContext,
  ReferenceLoader,
  ReferenceReader,
} from './tour-ingestion.ports';
import { categoriesFrom, codeNames, text } from './tour-mapping';
import { MappingError } from './tour-errors';
import type { References } from './tour-types';

export class TourReferenceService implements ReferenceLoader {
  /**
   * TourReferenceService 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: api: 필요한 API 조회 기능; categories: 분류 저장 기능
   * @returns new로 생성한 TourReferenceService 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourReferenceService(api, categories)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourReferenceService(api, categories);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly api: ReferenceReader,
    private readonly categories: CategoryWriter,
  ) {}

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
  async load(): Promise<ReferenceContext> {
    const entries = categoriesFrom(
      await this.api.all('lclsSystmCode2', { lclsSystmListYn: 'Y' }),
    );
    const regions = codeNames(
      await this.api.all('ldongCode2', { lDongListYn: 'N' }),
    );
    if (!regions.size) throw new MappingError('Empty region reference');
    const refs: References = {
      categories: await this.categories.categories(entries),
      regions,
      districts: new Map(),
    };
    // 실행마다 새 지역 조회 기록을 쓴다. 실패한 이전 실행의 미완성 기준정보를 재사용하지 않는다.
    const loadedRegions = new Set<string>();
    return {
      refs,
      categoryCount: entries.length,

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
      ensureDistrict: async (item) => {
        const region = text(item.lDongRegnCd);
        if (!region || !/^\d{2}$/.test(region) || loadedRegions.has(region))
          return;
        const names = codeNames(
          await this.api.all('ldongCode2', {
            lDongListYn: 'N',
            lDongRegnCd: region,
          }),
        );
        for (const [code, name] of names)
          refs.districts.set(`${region}:${code}`, name);
        loadedRegions.add(region);
      },
    };
  }
}
