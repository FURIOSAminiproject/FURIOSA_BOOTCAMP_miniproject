/**
 * 일일 증분 수집의 마지막 성공 날짜 파일 담당. 수집 데이터 자체를 보관하는 파일은 아니다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dateValue } from '../tour-mapping';

export interface TourBatchState {
  /** 상태 파일 형식 버전. 현재 1. */
  version: 1;
  /** 해당 성공 기록이 어느 지역·관광 타입 조건에 속하는지 나타내는 값. */
  scope: string;
  /** 해당 범위 수집이 완전히 끝난 한국 날짜 YYYYMMDD. */
  lastSuccessfulDate: string;
}
export interface TourBatchStateStore {
  /**
   * 일일 수집의 마지막 성공 날짜를 파일에서 읽는다.
   *
   * 입력: 인자 없음. 생성자에서 받은 path를 읽는다.
   * @returns 검증된 상태 객체, 파일이 없으면 null.
   * @example
   * await state.read(); // 최초 실행에서 파일이 없으면 null
   *
   * 읽기 오류와 잘못된 JSON/날짜는 각각 CHECKPOINT_READ_FAILED, CHECKPOINT_INVALID 예외다.
   */
  read(): Promise<TourBatchState | null>;

  /**
   * 수집이 완전히 끝났을 때 성공 날짜를 상태 파일에 기록한다.
   *
   * 입력: state: version=1, scope: 수집 범위, lastSuccessfulDate: YYYYMMDD 날짜.
   * @returns 저장 완료 Promise<void>. 실패하면 CHECKPOINT_WRITE_FAILED 예외.
   * @example
   * await state.write({ version: 1, scope: "demo", lastSuccessfulDate: "20261026" });
   *
   * 임시 파일을 만든 뒤 이름을 바꿔 교체한다. 중간 실패로 기존 성공 기록을 덮지 않게 한다.
   */
  write(state: TourBatchState): Promise<void>;
}
export class TourBatchStateError extends Error {
  /**
   * TourBatchStateError 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: code: 외부에 노출해도 되는 오류 식별 코드
   * @returns new로 생성한 TourBatchStateError 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourBatchStateError(code)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourBatchStateError(code);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(readonly code: string) {
    super(code);
  }
}
export class FileTourBatchState implements TourBatchStateStore {
  /**
   * FileTourBatchState 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: path: 성공 날짜를 기록할 파일 경로
   * @returns new로 생성한 FileTourBatchState 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // FileTourBatchState(path)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new FileTourBatchState(path);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly path: string) {}

  /**
   * 일일 수집의 마지막 성공 날짜를 파일에서 읽는다.
   *
   * 입력: 인자 없음. 생성자에서 받은 path를 읽는다.
   * @returns 검증된 상태 객체, 파일이 없으면 null.
   * @example
   * await state.read(); // 최초 실행에서 파일이 없으면 null
   *
   * 읽기 오류와 잘못된 JSON/날짜는 각각 CHECKPOINT_READ_FAILED, CHECKPOINT_INVALID 예외다.
   */
  async read(): Promise<TourBatchState | null> {
    let content: string;
    try {
      content = await readFile(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new TourBatchStateError('CHECKPOINT_READ_FAILED');
    }
    try {
      const value = JSON.parse(content) as TourBatchState;
      if (
        !value ||
        value.version !== 1 ||
        typeof value.scope !== 'string' ||
        typeof value.lastSuccessfulDate !== 'string' ||
        !dateValue(value.lastSuccessfulDate)
      )
        throw new Error();
      return value;
    } catch {
      throw new TourBatchStateError('CHECKPOINT_INVALID');
    }
  }

  /**
   * 수집이 완전히 끝났을 때 성공 날짜를 상태 파일에 기록한다.
   *
   * 입력: state: version=1, scope: 수집 범위, lastSuccessfulDate: YYYYMMDD 날짜.
   * @returns 저장 완료 Promise<void>. 실패하면 CHECKPOINT_WRITE_FAILED 예외.
   * @example
   * await state.write({ version: 1, scope: "demo", lastSuccessfulDate: "20261026" });
   *
   * 임시 파일을 만든 뒤 이름을 바꿔 교체한다. 중간 실패로 기존 성공 기록을 덮지 않게 한다.
   */
  async write(state: TourBatchState): Promise<void> {
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(temporary, JSON.stringify(state), {
        flag: 'wx',
        mode: 0o600,
      });
      await rename(temporary, this.path);
    } catch {
      await unlink(temporary).catch(
        /**
         * 실패한 상태 저장의 임시 파일 정리 오류를 무시한다.
         *
         * 입력: catch가 넘긴 오류는 사용하지 않는다.
         * @returns undefined. 바깥에서 원래 저장 실패 예외를 던진다.
         * @example
         * // 임시 파일도 이미 없으면 정리 오류 대신 CHECKPOINT_WRITE_FAILED 유지
         */
        () => undefined,
      );
      throw new TourBatchStateError('CHECKPOINT_WRITE_FAILED');
    }
  }
}
