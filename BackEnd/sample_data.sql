-- ------------------------------------------------------------
-- 자동 생성된 SQL 파일 (출처: sample_data.json)
-- 대상 테이블: users | 추출 컬럼 수: 7 | 총 행 수: 3
-- ------------------------------------------------------------

-- ============================================================
-- 테이블 생성 DDL: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    `id` INTEGER,
    `name` VARCHAR(50),
    `email` VARCHAR(50),
    `city` VARCHAR(50),
    `salary` DOUBLE,
    `is_active` TINYINT(1),
    `notes` VARCHAR(50)
);

-- ============================================================

-- 데이터 삽입 DML: 총 3 건 (Batch Size: 50)

-- ============================================================

INSERT INTO users (`id`, `name`, `email`, `city`, `salary`, `is_active`, `notes`) VALUES
    (101, '홍길동', 'gildong@example.com', '서울', 5500.5, TRUE, '특이사항: 따옴표('')가 포함된 텍스트 테스트'),
    (102, '이영희', 'younghee@example.com', '부산', 6800.0, FALSE, NULL),
    (103, '김철수', 'chulsoo@example.com', '대구', 4800.2, TRUE, '신규 입사자');
