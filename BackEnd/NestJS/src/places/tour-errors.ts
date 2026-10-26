/**
 * 장소 수집 전용 오류. API/변환/저장 실패를 구분하고 인증정보가 섞인 원본 응답은 메시지에 넣지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { TourEndpoint } from './tour-types';

export class TourApiError extends Error {
  /**
   * TourApiError 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: code: 외부에 노출해도 되는 오류 식별 코드; endpoint: 선택적 TourAPI API 이름
   * @returns new로 생성한 TourApiError 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourApiError(code, endpoint)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourApiError(code, endpoint);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    readonly code: string,
    readonly endpoint?: TourEndpoint,
  ) {
    // 원본 응답과 요청 URL에는 인증정보가 있을 수 있어 오류 메시지에 넣지 않는다.
    super(`TourAPI ${code}${endpoint ? ` (${endpoint})` : ''}`);
  }
}
export class MappingError extends Error {}
export class TourStoreError extends Error {
  /**
   * TourStoreError 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: code: 외부에 노출해도 되는 오류 식별 코드
   * @returns new로 생성한 TourStoreError 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourStoreError(code)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourStoreError(code);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(readonly code: string) {
    super(`Tour ingestion database error (${code})`);
  }
}
