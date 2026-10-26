/**
 * 수집 출처와 원본 JSON을 저장하기 전 인증 필드를 제거하는 담당.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { record } from './tour-types';

/**
 * 수집 출처 URL에서 인증정보와 fragment를 제거한다.
 *
 * 입력: value: URL 문자열. 유효하지 않은 URL이면 URL 생성자의 예외가 발생한다.
 * @returns 사용자명·암호·인증 쿼리·#부분이 제거된 URL 문자열.
 * @example
 * sourceUrl("https://example.com/api?serviceKey=demo&pageNo=1#memo"); // "https://example.com/api?pageNo=1"
 *
 * demo는 설명용 값이다. 실제 인증키를 출처 컬럼이나 로그에 남기지 않는다.
 */
export function sourceUrl(value: string): string {
  const url = new URL(value);
  url.username = '';
  url.password = '';
  url.hash = '';
  // URLSearchParams는 삭제하면 순회 위치가 바뀐다. 키를 복사해야 연속된 인증 필드도 빠짐없이 지운다.
  // oxlint-disable-next-line unicorn/no-useless-spread
  for (const key of [...url.searchParams.keys()]) {
    if (
      /^(servicekey|api[_-]?key|authorization|access[_-]?token|token)$/i.test(
        key,
      )
    )
      url.searchParams.delete(key);
  }
  return url.href;
}

/**
 * 객체와 배열을 재귀적으로 복사하며 인증 필드를 제거한다.
 *
 * 입력: value: 저장하려는 원본 JSON 값.
 * @returns 인증 필드 이름을 제거한 새 객체/배열. 문자열 등 기본값은 그대로 반환한다.
 * @example
 * sanitize({ token: "demo", place: { title: "공원" } }); // { place: { title: "공원" } }
 *
 * 문자열 안의 URL까지 분석하지 않는다. URL은 별도로 sourceUrl()을 거친다.
 */
export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (record(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          /**
           * 인증 필드 이름을 저장 대상에서 제외한다.
           *
           * 입력: [key]: 객체 속성 이름.
           * @returns serviceKey/token 등 인증 이름이면 false.
           * @example
           * // "token" → false, "title" → true
           */
          ([key]) =>
            !/^(servicekey|api[_-]?key|authorization|access[_-]?token|token)$/i.test(
              key,
            ),
        )
        .map(
          /**
           * 남길 속성의 값도 재귀적으로 인증 필드를 제거한다.
           *
           * 입력: [key,item]: 객체 속성의 이름·값.
           * @returns [key,sanitize(item)] 쌍.
           * @example
           * // ["nested",{token:"demo",name:"공원"}] → ["nested",{name:"공원"}]
           */
          ([key, item]) => [key, sanitize(item)],
        ),
    );
  return value;
}
