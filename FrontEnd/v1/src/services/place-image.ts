/** 외부 사진 주소를 그대로 src에 넣지 않는다. 구버전 API의 사진 필드 생략도 허용한다. */
export function placeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2048)
    return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return null;
    if (url.protocol === "http:" && url.hostname === "tong.visitkorea.or.kr")
      url.protocol = "https:";
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
