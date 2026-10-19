"""
PostgreSQL 데이터베이스 접속 및 데이터 로더 (postgres_loader.py)
================================================================
PostgreSQL 데이터베이스에 연결하여 테이블 및 SQL 쿼리 결과를
Python 딕셔너리, 리스트, JSON 또는 CSV 파일로 로드하는 유틸리티 모듈입니다.

주요 기능:
1. 다양한 드라이버 자동 감지:
   - psycopg2 (psycopg2-binary) 및 psycopg 3 (psycopg) 모두 지원
   - 미설치 시 친절한 설치 가이드 및 Mock(시뮬레이션) 모드 제공
2. 유연한 접속 설정:
   - 개별 인자 (host, port, dbname, user, password)
   - PostgreSQL 표준 환경변수 (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)
   - 연결 URL (postgresql://user:password@host:port/dbname)
3. 데이터 로드 방식:
   - load_data(): SQL 쿼리 실행 후 딕셔너리 리스트(List[Dict]) 반환
   - load_table(): 특정 테이블의 컬럼, 조건(WHERE), 정렬(ORDER BY), 제한(LIMIT) 간편 조회
   - load_chunks(): 대용량 데이터 처리를 위한 청크 단위 제너레이터 스트리밍
   - to_json() / to_csv(): 조회 데이터를 파일로 저장
4. 테이블 목록 및 스키마 메타데이터 조회 (get_tables, get_table_schema)
5. 안전한 자원 관리: 컨텍스트 매니저 (with PostgresLoader(...) as db:) 지원
"""

import os
import sys
import json
import csv
import argparse
from typing import List, Dict, Any, Optional, Tuple, Generator

# Windows 콘솔 인코딩 호환성 처리
if sys.platform.startswith("win"):
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


# ==============================================================================
# 1. PostgreSQL 드라이버 감지 및 임포트
# ==============================================================================
DRIVER_TYPE = None
psycopg_module = None

try:
    import psycopg2
    import psycopg2.extras
    DRIVER_TYPE = "psycopg2"
    psycopg_module = psycopg2
except ImportError:
    try:
        import psycopg
        from psycopg.rows import dict_row
        DRIVER_TYPE = "psycopg3"
        psycopg_module = psycopg
    except ImportError:
        DRIVER_TYPE = None


# ==============================================================================
# 2. PostgresLoader 핵심 클래스
# ==============================================================================
class PostgresLoader:
    """PostgreSQL 데이터베이스 접속 및 데이터 로드 관리자"""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        database: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        connection_url: Optional[str] = None,
        sslmode: Optional[str] = None,
        mock_mode: bool = False
    ):
        """
        접속 정보를 초기화합니다. 전달되지 않은 인자는 환경변수에서 자동으로 로드합니다.
        """
        self.mock_mode = mock_mode or (DRIVER_TYPE is None)

        if connection_url:
            self.connection_url = connection_url
            self.conn_params = None
        else:
            self.connection_url = os.environ.get("DATABASE_URL")
            self.conn_params = {
                "host": host or os.environ.get("PGHOST") or os.environ.get("POSTGRES_HOST") or "localhost",
                "port": int(port or os.environ.get("PGPORT") or os.environ.get("POSTGRES_PORT") or 5432),
                "dbname": database or os.environ.get("PGDATABASE") or os.environ.get("POSTGRES_DB") or "postgres",
                "user": user or os.environ.get("PGUSER") or os.environ.get("POSTGRES_USER") or "postgres",
                "password": password or os.environ.get("PGPASSWORD") or os.environ.get("POSTGRES_PASSWORD") or ""
            }
            if sslmode or os.environ.get("PGSSLMODE"):
                self.conn_params["sslmode"] = sslmode or os.environ.get("PGSSLMODE")

        self._conn = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def connect(self):
        """데이터베이스에 연결을 수립합니다."""
        if self.mock_mode:
            return

        if DRIVER_TYPE is None:
            raise ImportError(
                "PostgreSQL 드라이버가 설치되어 있지 않습니다.\n"
                "다음 명령어 중 하나를 실행하여 드라이버를 설치해주세요:\n"
                "  pip install psycopg2-binary   (권장)\n"
                "  pip install \"psycopg[binary]\" (최신 버전)"
            )

        try:
            if DRIVER_TYPE == "psycopg2":
                if self.connection_url:
                    self._conn = psycopg2.connect(self.connection_url)
                else:
                    self._conn = psycopg2.connect(**self.conn_params)
            elif DRIVER_TYPE == "psycopg3":
                if self.connection_url:
                    self._conn = psycopg.connect(self.connection_url)
                else:
                    self._conn = psycopg.connect(**self.conn_params)
        except Exception as e:
            raise ConnectionError(f"PostgreSQL 연결 실패: {e}")

    def close(self):
        """데이터베이스 연결을 닫습니다."""
        if self._conn and not self._conn.closed:
            self._conn.close()
            self._conn = None

    def is_connected(self) -> bool:
        if self.mock_mode:
            return True
        return self._conn is not None and not self._conn.closed

    def _ensure_connected(self):
        if not self.is_connected():
            self.connect()

    # --------------------------------------------------------------------------
    # 데이터베이스 상태 및 메타데이터 조회
    # --------------------------------------------------------------------------
    def test_connection(self) -> Dict[str, Any]:
        """연결 상태를 테스트하고 서버 정보를 반환합니다."""
        if self.mock_mode:
            return {
                "status": "connected (MOCK MODE)",
                "driver": "Mock Engine (Driver not installed)",
                "database": self.conn_params.get("dbname") if self.conn_params else "mock_db",
                "version": "PostgreSQL 16.2 (Mock Simulation) on x86_64",
                "host": self.conn_params.get("host") if self.conn_params else "localhost"
            }

        self._ensure_connected()
        with self._conn.cursor() as cur:
            cur.execute("SELECT version();")
            version_str = cur.fetchone()[0]

            cur.execute("SELECT current_database(), current_user, inet_server_port();")
            db_name, db_user, db_port = cur.fetchone()

        return {
            "status": "connected",
            "driver": DRIVER_TYPE,
            "database": db_name,
            "user": db_user,
            "port": db_port,
            "version": version_str
        }

    def get_tables(self, schema: str = "public") -> List[str]:
        """지정한 스키마(기본값: public)에 존재하는 모든 테이블 목록을 반환합니다."""
        if self.mock_mode:
            return ["users", "orders", "weather_observations", "products"]

        self._ensure_connected()
        query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """
        with self._conn.cursor() as cur:
            cur.execute(query, (schema,))
            return [row[0] for row in cur.fetchall()]

    def get_table_schema(self, table_name: str, schema: str = "public") -> List[Dict[str, Any]]:
        """테이블의 컬럼명, 데이터 타입, 널 허용 여부 등 스키마 정보를 반환합니다."""
        if self.mock_mode:
            return [
                {"column_name": "id", "data_type": "integer", "is_nullable": "NO"},
                {"column_name": "name", "data_type": "character varying", "is_nullable": "YES"},
                {"column_name": "created_at", "data_type": "timestamp with time zone", "is_nullable": "NO"}
            ]

        self._ensure_connected()
        query = """
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default
            FROM information_schema.columns 
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position;
        """
        with self._conn.cursor() as cur:
            cur.execute(query, (schema, table_name))
            cols = [desc[0] for desc in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    # --------------------------------------------------------------------------
    # 데이터 로드 메서드 (Data Loading)
    # --------------------------------------------------------------------------
    def load_data(
        self,
        query: str,
        params: Optional[Tuple] = None,
        as_dict: bool = True
    ) -> List[Any]:
        """
        SQL 쿼리를 실행하여 결과 데이터를 로드합니다.

        :param query: 실행할 SELECT SQL 쿼리
        :param params: SQL 인젝션 방지를 위한 매개변수 튜플 (예: (10, '서울'))
        :param as_dict: True면 List[Dict] 반환, False면 List[Tuple] 반환
        :return: 조회된 레코드 리스트
        """
        if self.mock_mode:
            # 드라이버 미설치 시 테스트용 가상 데이터 반환
            return [
                {"id": 1, "name": "홍길동", "email": "gildong@example.com", "role": "admin", "points": 1200},
                {"id": 2, "name": "이영희", "email": "younghee@example.com", "role": "user", "points": 850},
                {"id": 3, "name": "김철수", "email": "chulsoo@example.com", "role": "user", "points": 940}
            ] if as_dict else [
                (1, "홍길동", "gildong@example.com", "admin", 1200),
                (2, "이영희", "younghee@example.com", "user", 850),
                (3, "김철수", "chulsoo@example.com", "user", 940)
            ]

        self._ensure_connected()

        if DRIVER_TYPE == "psycopg2":
            cursor_factory = psycopg2.extras.RealDictCursor if as_dict else None
            with self._conn.cursor(cursor_factory=cursor_factory) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                if as_dict:
                    return [dict(r) for r in rows]
                return rows

        elif DRIVER_TYPE == "psycopg3":
            row_factory = dict_row if as_dict else None
            with self._conn.cursor(row_factory=row_factory) as cur:
                cur.execute(query, params)
                return cur.fetchall()

        return []

    def load_table(
        self,
        table_name: str,
        columns: Optional[List[str]] = None,
        where: Optional[str] = None,
        params: Optional[Tuple] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        테이블명과 옵션을 지정하여 간편하게 데이터를 로드합니다.
        """
        col_clause = ", ".join(f'"{c}"' for c in columns) if columns else "*"
        query = f'SELECT {col_clause} FROM "{table_name}"'

        if where:
            query += f" WHERE {where}"
        if order_by:
            query += f" ORDER BY {order_by}"
        if limit is not None:
            query += f" LIMIT {int(limit)}"
        if offset is not None:
            query += f" OFFSET {int(offset)}"

        return self.load_data(query, params=params, as_dict=True)

    def load_chunks(
        self,
        query: str,
        params: Optional[Tuple] = None,
        chunk_size: int = 1000
    ) -> Generator[List[Dict[str, Any]], None, None]:
        """
        대용량 데이터를 메모리 부담 없이 chunk_size 단위로 끊어서 가져오는 제너레이터입니다.
        (Server-side Cursor 활용)
        """
        if self.mock_mode:
            yield self.load_data(query, params, as_dict=True)
            return

        self._ensure_connected()

        if DRIVER_TYPE == "psycopg2":
            cursor_name = f"chunk_cur_{abs(hash(query))}"
            with self._conn.cursor(name=cursor_name, cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(query, params)
                while True:
                    rows = cur.fetchmany(chunk_size)
                    if not rows:
                        break
                    yield [dict(r) for r in rows]

        elif DRIVER_TYPE == "psycopg3":
            with self._conn.cursor(row_factory=dict_row) as cur:
                cur.execute(query, params)
                while True:
                    rows = cur.fetchmany(chunk_size)
                    if not rows:
                        break
                    yield rows

    # --------------------------------------------------------------------------
    # 파일 내보내기 유틸리티 (JSON / CSV)
    # --------------------------------------------------------------------------
    def to_json(self, query: str, output_path: str, params: Optional[Tuple] = None, indent: int = 2):
        """조회한 쿼리 결과를 JSON 파일로 저장합니다."""
        data = self.load_data(query, params=params, as_dict=True)
        # datetime 직렬화 지원
        def default_serializer(obj):
            if hasattr(obj, "isoformat"):
                return obj.isoformat()
            return str(obj)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=indent, default=default_serializer)
        print(f"✅ JSON 파일 저장 완료: {output_path} (총 {len(data)} 건)")

    def to_csv(self, query: str, output_path: str, params: Optional[Tuple] = None):
        """조회한 쿼리 결과를 CSV 파일로 저장합니다."""
        data = self.load_data(query, params=params, as_dict=True)
        if not data:
            print("⚠️ 저장할 데이터가 없습니다.")
            return

        headers = list(data[0].keys())
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(data)
        print(f"✅ CSV 파일 저장 완료: {output_path} (총 {len(data)} 건)")


# ==============================================================================
# 3. 콘솔 표 출력 헬퍼 함수
# ==============================================================================
def print_table(rows: List[Dict[str, Any]], max_col_width: int = 30):
    """딕셔너리 리스트를 터미널에 읽기 쉬운 표 형태로 출력합니다."""
    if not rows:
        print("조회된 데이터가 없습니다 (0 rows).")
        return

    headers = list(rows[0].keys())
    # 각 컬럼별 최대 길이 계산
    col_widths = {}
    for h in headers:
        max_len = len(str(h))
        for r in rows:
            val_len = len(str(r.get(h, "")))
            if val_len > max_len:
                max_len = val_len
        col_widths[h] = min(max_len, max_col_width)

    # 구분선 및 헤더 출력
    sep = "+" + "+".join(["-" * (col_widths[h] + 2) for h in headers]) + "+"
    print(sep)
    header_line = "| " + " | ".join([f"{str(h):<{col_widths[h]}}" for h in headers]) + " |"
    print(header_line)
    print(sep)

    # 데이터 행 출력
    for r in rows:
        row_str = []
        for h in headers:
            val_str = str(r.get(h, ""))
            if len(val_str) > max_col_width:
                val_str = val_str[:max_col_width-3] + "..."
            row_str.append(f"{val_str:<{col_widths[h]}}")
        print("| " + " | ".join(row_str) + " |")

    print(sep)
    print(f"총 {len(rows)} 개의 행이 조회되었습니다.\n")


# ==============================================================================
# 4. CLI 명령행 인터페이스
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="PostgreSQL 데이터베이스에 접속하여 데이터를 조회 및 로드하는 도구"
    )
    parser.add_argument("--host", default=None, help="DB 호스트 (기본값: localhost 또는 $PGHOST)")
    parser.add_argument("-p", "--port", type=int, default=None, help="DB 포트 (기본값: 5432 또는 $PGPORT)")
    parser.add_argument("-d", "--dbname", default=None, help="데이터베이스명 (기본값: postgres 또는 $PGDATABASE)")
    parser.add_argument("-u", "--user", default=None, help="사용자명 (기본값: postgres 또는 $PGUSER)")
    parser.add_argument("-w", "--password", default=None, help="비밀번호 (기본값: $PGPASSWORD)")
    parser.add_argument("--url", default=None, help="연결 URL (예: postgresql://user:pass@host:5432/db)")
    
    # 작업 옵션
    parser.add_argument("--test", action="store_true", help="DB 연결 상태 테스트")
    parser.add_argument("--list-tables", action="store_true", help="DB 내의 모든 테이블 목록 조회")
    parser.add_argument("--schema", default=None, help="특정 테이블의 스키마(컬럼 정보) 조회")
    parser.add_argument("-t", "--table", default=None, help="로드할 테이블명")
    parser.add_argument("-q", "--query", default=None, help="직접 실행할 SQL SELECT 쿼리")
    parser.add_argument("-n", "--limit", type=int, default=10, help="조회할 최대 행 개수 (기본값: 10)")
    
    # 내보내기 옵션
    parser.add_argument("--to-json", default=None, help="조회 결과를 JSON 파일로 저장")
    parser.add_argument("--to-csv", default=None, help="조회 결과를 CSV 파일로 저장")
    parser.add_argument("--demo", action="store_true", help="시뮬레이션(Mock) 모드로 실행 테스트")

    args = parser.parse_args()

    # 드라이버 상태 안내
    if DRIVER_TYPE is None and not args.demo:
        print("\n" + "=" * 65)
        print(" 💡 [알림] PostgreSQL Python 드라이버가 감지되지 않았습니다.")
        print("=" * 65)
        print(" 실제 데이터베이스에 접속하려면 아래 패키지를 설치해주세요:")
        print("   pip install psycopg2-binary")
        print("   (또는 최신 psycopg: pip install \"psycopg[binary]\")")
        print("-" * 65)
        print(" 현재 시뮬레이션(Mock) 모드로 전환하여 동작 방식을 시연합니다.")
        print("=" * 65 + "\n")

    loader = PostgresLoader(
        host=args.host,
        port=args.port,
        database=args.dbname,
        user=args.user,
        password=args.password,
        connection_url=args.url,
        mock_mode=args.demo or (DRIVER_TYPE is None)
    )

    try:
        # 1. 연결 테스트
        if args.test or (not args.list_tables and not args.schema and not args.table and not args.query):
            print("\n🔍 PostgreSQL 연결 상태 확인:")
            info = loader.test_connection()
            for k, v in info.items():
                print(f"  • {k:<10}: {v}")
            print()

        # 2. 테이블 목록 조회
        if args.list_tables:
            tables = loader.get_tables()
            print(f"\n📂 데이터베이스 내 테이블 목록 ({len(tables)}개):")
            for tbl in tables:
                print(f"  - {tbl}")
            print()

        # 3. 테이블 스키마 조회
        if args.schema:
            print(f"\n📋 '{args.schema}' 테이블 스키마:")
            schema_info = loader.get_table_schema(args.schema)
            print_table(schema_info)

        # 4. 데이터 로드 (테이블 또는 쿼리)
        if args.table or args.query:
            if args.query:
                query = args.query
            else:
                query = f'SELECT * FROM "{args.table}" LIMIT {args.limit}'

            print(f"\n🚀 SQL 쿼리 실행: {query}")
            results = loader.load_data(query, as_dict=True)

            # 파일 내보내기 또는 화면 출력
            if args.to_json:
                loader.to_json(query, args.to_json)
            elif args.to_csv:
                loader.to_csv(query, args.to_csv)
            else:
                print_table(results)

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}\n")
    finally:
        loader.close()


if __name__ == "__main__":
    main()

