/**
 * 상세 API의 호출 파라미터 정책. 공통 정보 이후 소개·반복·이미지 세 단계를 사용한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { TourItem, TourParams } from './tour-types';

export interface DetailStep {
  /** 공통 상세 이후 조회할 API. 소개/반복/이미지 세 종류를 모두 등록한다. */
  readonly endpoint: 'detailIntro2' | 'detailInfo2' | 'detailImage2';

  /**
   * 상세 단계가 사용할 API 쿼리를 만드는 계약이다.
   *
   * 입력: contentId: 외부 장소 ID, item: 공통 상세 정보.
   * @returns 상세 API에 전달할 TourParams.
   * @example
   * // 소개 단계 → {contentId:"126128",contentTypeId:"12"}; 이미지 단계 → {contentId:"126128",imageYN:"Y"}
   */
  params(contentId: string, item: TourItem): TourParams;
}

/**
 * 소개·반복 상세 API가 요구하는 장소 ID와 관광 타입을 만든다.
 *
 * 입력: contentId: 외부 장소 ID, item: detailCommon2에서 받은 공통 정보.
 * @returns {contentId, contentTypeId} 쿼리 객체.
 * @example
 * typedParams("126128", { contenttypeid: "12" }); // { contentId: "126128", contentTypeId: "12" }
 */
const typedParams = (contentId: string, item: TourItem): TourParams => ({
  contentId,
  contentTypeId: String(item.contenttypeid),
});
export const DEFAULT_DETAIL_STEPS: readonly DetailStep[] = [
  { endpoint: 'detailIntro2', params: typedParams },
  { endpoint: 'detailInfo2', params: typedParams },
  {
    endpoint: 'detailImage2',

    /**
     * 이미지 상세 조회 쿼리를 만든다.
     *
     * 입력: contentId: 외부 장소 ID.
     * @returns {contentId, imageYN:"Y"}.
     * @example
     * // contentId="126128" → {contentId:"126128",imageYN:"Y"}
     */
    params: (contentId) => ({ contentId, imageYN: 'Y' }),
  },
];
