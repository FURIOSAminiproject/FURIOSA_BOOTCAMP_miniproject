/** 브라우저에서 읽을 대표 사진 주소만 허용한다. 사진을 서버에서 대신 가져오지는 않는다. */
export function placeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048)
    return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return null;
    // TourAPI가 HTTP로 제공하는 기존 관광공사 이미지도 HTTPS 페이지에서 표시한다.
    if (url.protocol === 'http:' && url.hostname === 'tong.visitkorea.or.kr')
      url.protocol = 'https:';
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
