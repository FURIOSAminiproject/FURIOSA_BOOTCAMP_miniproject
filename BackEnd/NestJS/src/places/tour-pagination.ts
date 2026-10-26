import { TourApiError } from './tour-errors';
import type { TourEndpoint, TourPage } from './tour-types';

/**
 * 응답 페이지가 전체 건수와 현재 페이지 크기에 맞게 빠짐없이 왔는지 검사한다.
 * 입력: page: 응답 항목·전체 건수·페이지 번호, pageSize: 요청한 페이지 크기,
 * endpoint: 오류에 표시할 API 이름, requestedPage: 요청한 페이지 번호(기본 응답 번호).
 * @returns 정상이면 void. 번호 불일치나 예상 항목 누락·초과면 TourApiError.
 * @example
 * // 전체 102건, 크기 100, 2페이지라면 정확히 2개 항목이 있어야 한다.
 * assertCompletePage({items:[item1,item2],totalCount:102,pageNo:2},100,'areaBasedList2',2);
 *
 * 빈 응답뿐 아니라 일부 항목만 온 마지막 페이지도 실패시킨다. DB 저장이나 API 호출은 하지 않는다.
 */
export function assertCompletePage(
  page: Pick<TourPage, 'items' | 'totalCount' | 'pageNo'>,
  pageSize: number,
  endpoint: TourEndpoint,
  requestedPage = page.pageNo,
): void {
  if (
    !Number.isSafeInteger(page.totalCount) ||
    page.totalCount < 0 ||
    !Number.isSafeInteger(page.pageNo) ||
    page.pageNo < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1
  ) {
    throw new TourApiError('INVALID_PAGINATION', endpoint);
  }
  if (page.pageNo !== requestedPage)
    throw new TourApiError('PAGE_MISMATCH', endpoint);
  const expectedRows = Math.max(
    0,
    Math.min(pageSize, page.totalCount - (page.pageNo - 1) * pageSize),
  );
  if (page.items.length !== expectedRows)
    throw new TourApiError('INCOMPLETE_PAGE', endpoint);
}
