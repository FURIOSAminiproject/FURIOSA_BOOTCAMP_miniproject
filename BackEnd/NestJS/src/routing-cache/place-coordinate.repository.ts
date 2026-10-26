/**
 * 경로 계산에 필요한 활성 장소 좌표 조회 담당. DB의 numeric 문자열은 resolver가 숫자로 바꾼다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { DataSource } from 'typeorm';
import type {
  PlaceCoordinateReader,
  PlaceCoordinateRecord,
} from './routing.ports';

export class PlaceCoordinateRepository implements PlaceCoordinateReader {
  /**
   * PlaceCoordinateRepository 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: db: 주입받은 SQL 실행기
   * @returns new로 생성한 PlaceCoordinateRepository 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // PlaceCoordinateRepository(db)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new PlaceCoordinateRepository(db);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly db: Pick<DataSource, 'query'>) {}

  /**
   * 활성 장소들의 DB 좌표만 한 번에 조회한다.
   *
   * 입력: ids: 내부 place_id(UUID) 배열. 빈 배열이면 DB를 조회하지 않는다.
   * @returns 활성 행만 담은 PlaceCoordinateRecord[]. 없는 ID는 반환 목록에서 빠진다.
   * @example
   * await places.findActive([]); // []이며 SQL 실행 없음
   *
   * PostgreSQL numeric은 문자열일 수 있다. 숫자 변환과 좌표 검사는 resolver가 담당한다.
   */
  async findActive(ids: string[]): Promise<PlaceCoordinateRecord[]> {
    if (!ids.length) return [];
    const rows: {
      place_id: string;
      latitude: string | number | null;
      longitude: string | number | null;
    }[] = await this.db.query(
      'SELECT place_id,latitude,longitude FROM places WHERE place_id=ANY($1::uuid[]) AND is_active=true',
      [ids],
    );
    return rows.map(
      /**
       * DB 좌표 행의 필드 이름만 서비스 형식으로 바꾼다.
       *
       * 입력: row: place_id/latitude/longitude DB 행.
       * @returns placeId/latitude/longitude 객체.
       * @example
       * // latitude="35.1" 문자열은 유지; 숫자 변환은 resolver가 수행
       */
      (row) => ({
        placeId: row.place_id,
        latitude: row.latitude,
        longitude: row.longitude,
      }),
    );
  }
}
