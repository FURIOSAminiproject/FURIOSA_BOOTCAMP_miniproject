"""
JSON to SQL 변환기 (convert_json2sql.py)
========================================
JSON 파일에서 필요한 필드(키)를 추출하여 데이터베이스(MySQL, PostgreSQL, SQLite 등)에 
저장할 수 있는 .sql 파일(CREATE TABLE 및 INSERT 문)을 생성하는 유틸리티 스크립트입니다.

주요 기능:
1. 다양한 JSON 구조 자동 인식:
   - 객체 배열: [ {"id": 1, ...}, {"id": 2, ...} ]
   - 감싸진 객체: { "data": [ ... ] } 또는 { "items": [ ... ] }
   - 단일 객체: { "id": 1, ... }
2. 필요한 필드(컬럼) 선별 및 매핑:
   - 특정 필드만 선택 추출 (--fields id,name,email)
   - 중첩 필드(dot notation) 추출 지원 (예: profile.age, address.city)
   - JSON 키를 DB 컬럼명으로 이름 변경 (--mapping id:user_id,name:user_name)
3. 데이터 타입 자동 추론 및 CREATE TABLE DDL 생성
4. SQL 인젝션 및 특수문자 이스케이프 (' -> '')
5. 벌크 INSERT(Multi-row INSERT) 지원으로 빠른 대용량 적재 가능
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any, Optional, Tuple

# Windows 콘솔 인코딩 호환성 처리
if sys.platform.startswith("win"):
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


class JSONToSQLConverter:
    """JSON 데이터를 파싱하여 SQL 스크립트로 변환하는 클래스"""

    def __init__(
        self,
        table_name: str = "my_table",
        selected_fields: Optional[List[str]] = None,
        field_mapping: Optional[Dict[str, str]] = None,
        include_create_table: bool = True,
        batch_size: int = 100,
        dialect: str = "generic"
    ):
        """
        :param table_name: SQL 테이블 이름
        :param selected_fields: 추출할 필드 목록 (None이면 모든 필드 자동 추출)
        :param field_mapping: {json_field: db_column} 매핑 딕셔너리
        :param include_create_table: CREATE TABLE DDL 포함 여부
        :param batch_size: INSERT 당 행(row) 개수 (0 또는 1이면 단일 INSERT)
        :param dialect: 대상 DB 방언 ('generic', 'mysql', 'postgresql', 'sqlite')
        """
        self.table_name = table_name
        self.selected_fields = selected_fields
        self.field_mapping = field_mapping or {}
        self.include_create_table = include_create_table
        self.batch_size = max(1, batch_size)
        self.dialect = dialect.lower()

    @staticmethod
    def load_json(json_path: str) -> List[Dict[str, Any]]:
        """JSON 파일을 읽어 일관된 딕셔너리 리스트(List[Dict]) 형태로 반환"""
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"JSON 파일을 찾을 수 없습니다: {json_path}")

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            # 최상위가 리스트인 경우
            return [item for item in data if isinstance(item, dict)]
        elif isinstance(data, dict):
            # 최상위가 딕셔너리인 경우, 배열이 들어있는 키('data', 'items', 'rows', 'results' 등) 탐색
            for key in ["data", "items", "results", "rows", "records", "list"]:
                if key in data and isinstance(data[key], list):
                    return [item for item in data[key] if isinstance(item, dict)]
            # 리스트를 찾지 못했으면 단일 객체로 취급
            return [data]
        else:
            raise ValueError("지원하지 않는 JSON 루트 형식입니다. JSON 객체나 배열이어야 합니다.")

    @staticmethod
    def get_nested_value(data: Dict[str, Any], path: str) -> Any:
        """점 표기법(dot.notation)으로 중첩된 딕셔너리 값 추출 (예: 'profile.address.city')"""
        keys = path.split(".")
        current = data
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return None
        return current

    def extract_rows(self, raw_items: List[Dict[str, Any]]) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        사용자가 지정한 필드와 매핑 규칙에 따라 각 레코드에서 필요한 데이터를 추출.
        반환값: (최종 DB 컬럼명 리스트, 추출된 레코드 리스트)
        """
        if not raw_items:
            return [], []

        # 1. 추출할 원본 필드 목록 결정
        if self.selected_fields:
            fields_to_extract = self.selected_fields
        else:
            # 지정하지 않은 경우 데이터셋 전체에서 등장하는 모든 키 집합 추출 (순서 보존)
            seen_keys = {}
            for item in raw_items:
                for k in item.keys():
                    seen_keys[k] = True
            fields_to_extract = list(seen_keys.keys())

        # 2. 최종 DB 컬럼명 매핑
        columns = [self.field_mapping.get(f, f.replace(".", "_")) for f in fields_to_extract]

        # 3. 데이터 추출
        extracted_rows = []
        for item in raw_items:
            row = {}
            for field, col in zip(fields_to_extract, columns):
                val = self.get_nested_value(item, field) if "." in field else item.get(field)
                row[col] = val
            extracted_rows.append(row)

        return columns, extracted_rows

    @staticmethod
    def infer_sql_type(values: List[Any], dialect: str = "generic") -> str:
        """값들의 샘플을 분석하여 가장 알맞은 SQL 데이터 타입을 추론"""
        non_null_vals = [v for v in values if v is not None]
        if not non_null_vals:
            return "TEXT"

        # 타입 판별
        has_str = any(isinstance(v, str) for v in non_null_vals)
        has_float = any(isinstance(v, float) for v in non_null_vals)
        has_int = any(isinstance(v, int) and not isinstance(v, bool) for v in non_null_vals)
        has_bool = any(isinstance(v, bool) for v in non_null_vals)
        has_dict_or_list = any(isinstance(v, (dict, list)) for v in non_null_vals)

        if has_dict_or_list:
            if dialect in ("postgresql", "postgres"):
                return "JSONB"
            elif dialect == "mysql":
                return "JSON"
            return "TEXT"

        if has_str:
            max_len = max(len(str(v)) for v in non_null_vals)
            if max_len <= 255:
                return f"VARCHAR({max(50, ((max_len // 50) + 1) * 50)})"
            return "TEXT"

        if has_float:
            if dialect in ("postgresql", "postgres"):
                return "DOUBLE PRECISION"
            return "DOUBLE" if dialect == "mysql" else "REAL"

        if has_int:
            max_val = max(abs(v) for v in non_null_vals)
            if max_val > 2147483647:
                return "BIGINT"
            return "INTEGER"

        if has_bool:
            if dialect in ("postgresql", "postgres"):
                return "BOOLEAN"
            elif dialect == "mysql":
                return "TINYINT(1)"
            return "BOOLEAN"

        return "TEXT"

    @staticmethod
    def format_sql_value(val: Any) -> str:
        """Python 값을 SQL 리터럴 문자열로 이스케이프 포맷팅"""
        if val is None:
            return "NULL"
        elif isinstance(val, bool):
            return "TRUE" if val else "FALSE"
        elif isinstance(val, (int, float)):
            return str(val)
        elif isinstance(val, (dict, list)):
            # 딕셔너리나 리스트는 JSON 문자열로 변환하여 문자열로 저장
            json_str = json.dumps(val, ensure_ascii=False)
            escaped = json_str.replace("'", "''")
            return f"'{escaped}'"
        else:
            # 문자열 및 기타 객체: 작은따옴표 이스케이프 (' -> '')
            str_val = str(val).replace("'", "''")
            return f"'{str_val}'"

    def generate_create_table_sql(self, columns: List[str], rows: List[Dict[str, Any]]) -> str:
        """테이블 생성 DDL 구문 생성"""
        column_defs = []
        for col in columns:
            vals = [row.get(col) for row in rows]
            col_type = self.infer_sql_type(vals, self.dialect)
            column_defs.append(f"    `{col}` {col_type}" if self.dialect == "mysql" else f"    \"{col}\" {col_type}")

        id_col = "`id`" if self.dialect == "mysql" else "\"id\""
        lines = [
            f"-- ============================================================",
            f"-- 테이블 생성 DDL: {self.table_name}",
            f"-- ============================================================",
            f"CREATE TABLE IF NOT EXISTS {self.table_name} (",
            ",\n".join(column_defs),
            ");\n"
        ]
        return "\n".join(lines)

    def generate_insert_sql(self, columns: List[str], rows: List[Dict[str, Any]]) -> str:
        """INSERT DML 구문 생성 (배치 크기에 따라 분할)"""
        if not rows or not columns:
            return "-- 삽입할 데이터가 없습니다.\n"

        col_names_str = ", ".join(f"`{col}`" if self.dialect == "mysql" else f"\"{col}\"" for col in columns)
        sql_lines = [
            f"-- ============================================================",
            f"-- 데이터 삽입 DML: 총 {len(rows)} 건 (Batch Size: {self.batch_size})",
            f"-- ============================================================"
        ]

        # 배치 단위로 분할하여 INSERT INTO ... VALUES (...), (...); 생성
        for i in range(0, len(rows), self.batch_size):
            batch = rows[i:i + self.batch_size]
            values_clauses = []
            for row in batch:
                formatted_vals = [self.format_sql_value(row.get(col)) for col in columns]
                values_clauses.append(f"    ({', '.join(formatted_vals)})")

            insert_stmt = f"INSERT INTO {self.table_name} ({col_names_str}) VALUES\n" + ",\n".join(values_clauses) + ";"
            sql_lines.append(insert_stmt)

        return "\n\n".join(sql_lines) + "\n"

    def convert(self, json_path: str, output_sql_path: str) -> None:
        """전체 변환을 수행하고 .sql 파일로 저장"""
        raw_items = self.load_json(json_path)
        if not raw_items:
            print(f"⚠️ 경고: '{json_path}'에 처리할 유효한 JSON 레코드가 없습니다.")
            return

        columns, rows = self.extract_rows(raw_items)

        sql_output_parts = [
            f"-- ------------------------------------------------------------",
            f"-- 자동 생성된 SQL 파일 (출처: {os.path.basename(json_path)})",
            f"-- 대상 테이블: {self.table_name} | 추출 컬럼 수: {len(columns)} | 총 행 수: {len(rows)}",
            f"-- ------------------------------------------------------------\n"
        ]

        if self.include_create_table:
            sql_output_parts.append(self.generate_create_table_sql(columns, rows))

        sql_output_parts.append(self.generate_insert_sql(columns, rows))

        full_sql = "\n".join(sql_output_parts)

        # 디렉토리가 없으면 생성
        out_dir = os.path.dirname(output_sql_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        with open(output_sql_path, "w", encoding="utf-8") as f:
            f.write(full_sql)

        print(f"✅ 변환 완료!")
        print(f"   - 입력 파일: {json_path}")
        print(f"   - 출력 파일: {output_sql_path}")
        print(f"   - 대상 테이블: {self.table_name}")
        print(f"   - 추출된 컬럼 ({len(columns)}개): {', '.join(columns)}")
        print(f"   - 변환된 데이터 행 수: {len(rows)} 개\n")


def create_sample_json_file(file_path: str = "sample_data.json") -> str:
    """테스트 및 데모용 샘플 JSON 파일 생성"""
    sample_data = {
        "status": "success",
        "data": [
            {
                "id": 101,
                "name": "홍길동",
                "email": "gildong@example.com",
                "age": 28,
                "is_active": True,
                "salary": 5500.50,
                "profile": {
                    "city": "서울",
                    "department": "AI 개발팀"
                },
                "tags": ["python", "ai", "backend"],
                "notes": "특이사항: 따옴표(')가 포함된 텍스트 테스트"
            },
            {
                "id": 102,
                "name": "이영희",
                "email": "younghee@example.com",
                "age": 32,
                "is_active": False,
                "salary": 6800.00,
                "profile": {
                    "city": "부산",
                    "department": "데이터 분석팀"
                },
                "tags": ["sql", "bigdata"],
                "notes": None
            },
            {
                "id": 103,
                "name": "김철수",
                "email": "chulsoo@example.com",
                "age": 25,
                "is_active": True,
                "salary": 4800.20,
                "profile": {
                    "city": "대구",
                    "department": "클라우드 인프라팀"
                },
                "tags": ["docker", "kubernetes"],
                "notes": "신규 입사자"
            }
        ]
    }
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(sample_data, f, ensure_ascii=False, indent=2)
    return file_path


def parse_mapping_argument(mapping_str: str) -> Dict[str, str]:
    """'json_field:col_name,field2:col2' 형식의 문자열을 파싱"""
    mapping = {}
    if not mapping_str:
        return mapping
    for pair in mapping_str.split(","):
        pair = pair.strip()
        if ":" in pair:
            k, v = pair.split(":", 1)
            mapping[k.strip()] = v.strip()
    return mapping


def main():
    parser = argparse.ArgumentParser(
        description="JSON 파일에서 필요한 필드를 추출하여 DB용 SQL(INSERT/CREATE TABLE) 파일을 생성하는 스크립트"
    )
    parser.add_argument("input_json", nargs="?", help="입력 JSON 파일 경로")
    parser.add_argument("-o", "--output", help="출력 .sql 파일 경로 (기본값: [입력파일명].sql)")
    parser.add_argument("-t", "--table", default=None, help="대상 테이블명 (기본값: 파일명 기반)")
    parser.add_argument("-f", "--fields", help="추출할 필드 목록 (쉼표로 구분, 예: id,name,email,profile.city)")
    parser.add_argument("-m", "--mapping", help="컬럼 매핑 (예: id:user_id,profile.city:city_name)")
    parser.add_argument("--no-create-table", action="store_true", help="CREATE TABLE DDL을 생성하지 않고 INSERT 문만 생성")
    parser.add_argument("-b", "--batch-size", type=int, default=100, help="한 번의 INSERT문에 포함할 행 개수 (기본값: 100)")
    parser.add_argument("-d", "--dialect", default="generic", choices=["generic", "mysql", "postgresql", "sqlite"], help="대상 DB 방언")
    parser.add_argument("--demo", action="store_true", help="샘플 JSON 데이터를 자동 생성하고 변환 테스트를 실행")

    args = parser.parse_args()

    # 데모 모드이거나 인자 없이 실행된 경우
    if args.demo or not args.input_json:
        print("\n" + "=" * 65)
        print(" 🛠️  JSON to SQL 변환기 (데모 모드)")
        print("=" * 65)
        sample_path = "sample_data.json"
        create_sample_json_file(sample_path)
        print(f"1. 데모용 샘플 JSON 파일 생성: '{sample_path}'")

        output_sql = "sample_data.sql"
        print(f"2. 필요한 필드(id, name, email, profile.city, salary, is_active) 추출 및 변환 실행...")

        converter = JSONToSQLConverter(
            table_name="users",
            selected_fields=["id", "name", "email", "profile.city", "salary", "is_active", "notes"],
            field_mapping={"profile.city": "city"},
            include_create_table=True,
            batch_size=50,
            dialect="mysql"
        )
        converter.convert(sample_path, output_sql)

        print("-" * 65)
        print("💡 생성된 SQL 파일 미리보기:")
        try:
            with open(output_sql, "r", encoding="utf-8") as f:
                lines = f.readlines()
                print("".join(lines[:30]))
                if len(lines) > 30:
                    print(f"... (총 {len(lines)} 줄)")
        except Exception as e:
            print(f"미리보기 실패: {e}")

        print("=" * 65)
        print("💡 사용 방법 안내:")
        print("  python convert_json2sql.py <파일명.json> [옵션]")
        print("  예시:")
        print("    1) 전체 변환:  python convert_json2sql.py my_data.json")
        print("    2) 필드 지정:  python convert_json2sql.py my_data.json -f id,name,email -t members")
        print("    3) 매핑 지정:  python convert_json2sql.py my_data.json -m id:user_id,profile.city:city -o output.sql")
        print("=" * 65 + "\n")
        return

    # 일반 변환 실행
    input_path = args.input_json
    output_path = args.output
    if not output_path:
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}.sql"

    table_name = args.table
    if not table_name:
        table_name = os.path.splitext(os.path.basename(input_path))[0].replace("-", "_").replace(" ", "_")

    selected_fields = [f.strip() for f in args.fields.split(",")] if args.fields else None
    field_mapping = parse_mapping_argument(args.mapping)

    converter = JSONToSQLConverter(
        table_name=table_name,
        selected_fields=selected_fields,
        field_mapping=field_mapping,
        include_create_table=not args.no_create_table,
        batch_size=args.batch_size,
        dialect=args.dialect
    )

    try:
        converter.convert(input_path, output_path)
    except Exception as e:
        print(f"❌ 변환 중 오류 발생: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

