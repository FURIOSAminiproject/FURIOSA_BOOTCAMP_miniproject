# -*- coding: utf-8 -*-
"""
build_native_slides.py
Slide 7 및 Slide 15를 Slide 12(Multi-stage Model Architecture)와 
동일한 구조의 Native PowerPoint 도형 다이어그램으로 생성
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

PPT_PATH = r"c:\furiosa-miniproject\FURIOSA_BOOTCAMP_miniproject\퓨리오사AIagent스쿨_미니프로젝트_IamyourJ_final_이지석_장동율.pptx"

prs = Presentation(PPT_PATH)

# 컬러 팔레트 정의 (Slide 12와 100% 일치)
COLOR_MINT_LIGHT  = RGBColor(221, 248, 242) # #DDF8F2 (주요 스테이지 블록)
COLOR_MINT_DARK   = RGBColor(162, 236, 220) # #A2ECDC (엔진/핵심 결과 블록)
COLOR_WHITE       = RGBColor(255, 255, 255) # #FFFFFF
COLOR_BORDER_MINT = RGBColor(94, 234, 212)  # #5EEAD4
COLOR_BORDER_TEAL = RGBColor(45, 212, 191)  # #2DD4BF
COLOR_BORDER_GRAY = RGBColor(148, 163, 184) # #94A3B8
COLOR_TEXT_MAIN   = RGBColor(15, 23, 42)    # #0F172A (다크 텍스트)
COLOR_TEXT_MUTED  = RGBColor(71, 85, 105)   # #475569 (서브타이틀)
COLOR_ARROW       = RGBColor(13, 148, 136)  # #0D9488 (청록색 화살표)
COLOR_LINE_GRAY   = RGBColor(203, 213, 225) # #CBD5E1 (스테이지 구분선)

def setup_text(paragraph, text, font_size=13, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER):
    paragraph.text = text
    paragraph.font.name = "Malgun Gothic"
    paragraph.font.size = Pt(font_size)
    paragraph.font.bold = bold
    paragraph.font.color.rgb = color
    paragraph.alignment = align

def add_rounded_box(slide, left, top, width, height, text_lines, fill_color, border_color=None, font_size=12.5):
    """Slide 12 스타일의 둥근 모서리 사각형 생성"""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.5)
    else:
        shape.line.fill.background()
        
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.12)
    tf.margin_right = Inches(0.12)
    tf.margin_top = Inches(0.12)
    tf.margin_bottom = Inches(0.12)
    
    # 텍스트 세팅
    for idx, (line, is_bold, sz, col, align) in enumerate(text_lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        setup_text(p, line, font_size=sz, bold=is_bold, color=col, align=align)
    return shape

def add_right_arrow(slide, left, top, width, height, color=COLOR_ARROW):
    """깔끔한 오른쪽 방향 화살표 생성"""
    arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left, top, width, height)
    arrow.fill.solid()
    arrow.fill.fore_color.rgb = color
    arrow.line.fill.background()
    return arrow

# =============================================================================
# 1. SLIDE 7: BackEnd – 여행 경로 생성 (Slide 12 Multi-stage Architecture 스타일)
# =============================================================================
print("[1] Building Native Shapes for Slide 7...")
slide7 = prs.slides[7]

# 기존 도형 중 타이틀, 구분선, 슬라이드 번호 제외하고 모두 제거
for s in list(slide7.shapes):
    if s.name not in ["슬라이드 번호 개체 틀 1", "TextBox 2", "직선 연결선 3"]:
        sp = s._element
        sp.getparent().remove(sp)

# 타이틀 확인 및 단일 라인 세팅
for s in slide7.shapes:
    if s.name == "TextBox 2":
        s.width = 6500000
        s.text_frame.text = "BackEnd – 여행 경로 생성"
        p = s.text_frame.paragraphs[0]
        p.font.name = "Malgun Gothic"
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = RGBColor(34, 59, 107)

# 서브타이틀 추가 (Slide 12의 TextBox 42와 동일 위치 및 스타일)
sub7 = slide7.shapes.add_textbox(664358, 1197015, 6000000, 494494)
p_sub7 = sub7.text_frame.paragraphs[0]
setup_text(p_sub7, "Multi-stage Routing & Spatial Curation Architecture", font_size=18, bold=True, color=COLOR_TEXT_MUTED, align=PP_ALIGN.LEFT)

# 중앙 스테이지 구분선 (Slide 12의 직선 연결선 18과 동일)
line7 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, 5450000, 1900000, Pt(1.5), 3500000)
line7.fill.solid()
line7.fill.fore_color.rgb = COLOR_LINE_GRAY
line7.line.fill.background()

# --- Stage 1 (좌측): ORS 최적 경로 탐색 & 24h 캐싱 ---
# 1) Input Node (사용자 입력)
add_rounded_box(
    slide7, 500000, 2400000, 1000000, 2400000,
    [
        ("사용자 요청", True, 15, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("출발·도착\n위경도 좌표", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("자차 / 도보\n이동수단", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)
add_right_arrow(slide7, 1550000, 3350000, 320000, 480000)

# 2) Process 1-A (PostgreSQL 24h 캐시)
add_rounded_box(
    slide7, 1920000, 2050000, 2000000, 1500000,
    [
        ("PostgreSQL 24h 캐시", True, 14.5, RGBColor(6, 78, 59), PP_ALIGN.CENTER),
        ("routes_cache 테이블 검사", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• SHA-256 고유 해시 키 대조", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 캐시 히트 시 10ms 즉시 반환", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 외부 API 호출 85% 대폭 절감", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)

# 3) Process 1-B (OpenRouteService 엔진)
add_rounded_box(
    slide7, 1920000, 3800000, 2000000, 1500000,
    [
        ("OpenRouteService (ORS)", True, 14.5, RGBColor(17, 94, 89), PP_ALIGN.CENTER),
        ("오픈 도로망 경로 탐색 엔진", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• 자차/도보 전용 도로망 분리", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 추천 및 최단 대안 2종 산출", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• GeoJSON LineString 추출", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL
)
add_right_arrow(slide7, 3970000, 3350000, 320000, 480000)

# 4) Output 1 (경로 좌표열)
add_rounded_box(
    slide7, 4340000, 2400000, 950000, 2400000,
    [
        ("도로 궤적\n데이터", True, 15, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("GeoJSON\nLineString\n좌표열", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("주행 거리 및\n구간 시간", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)

# Stage 1 하단 라벨 (Slide 12의 TextBox 32)
lbl_st1 = slide7.shapes.add_textbox(1100000, 5501366, 3500000, 882293)
p1 = lbl_st1.text_frame.paragraphs[0]
setup_text(p1, "Stage 1\n이동 경로 생성 및 24h 캐시 탐색", font_size=16, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER)

# --- Stage 2 (우측): 선형 보간 & 길목 명소 큐레이션 ---
# 스테이지 연결 화살표
add_right_arrow(slide7, 5340000, 3350000, 320000, 480000)

# 5) Process 2-A (선형 보간 타임라인)
add_rounded_box(
    slide7, 5720000, 2050000, 2200000, 1500000,
    [
        ("타임라인 선형 보간법", True, 14.5, RGBColor(6, 78, 59), PP_ALIGN.CENTER),
        ("Linear Interpolation 수학 연산", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• 구간별 주행 시간 누적 계산", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 30분 단위 도로 통과 지점 역산", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 시간대별 기준 경유 지점 산출", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)

# 6) Process 2-B (PostGIS 5km 공간 버퍼)
add_rounded_box(
    slide7, 5720000, 3800000, 2200000, 1500000,
    [
        ("PostGIS 반경 5km 공간 질의", True, 14.5, RGBColor(6, 78, 59), PP_ALIGN.CENTER),
        ("Haversine 최단 수직거리 계산", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• 도로 선분 기준 5km 버퍼 생성", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• GiST R-Tree 30ms 초고속 질의", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 동선 이탈 없는 도로변 POI 추출", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)
add_right_arrow(slide7, 7970000, 3350000, 320000, 480000)

# 7) Process 2-C (TourAPI 4.0 & Leaflet 시각화)
add_rounded_box(
    slide7, 8340000, 2050000, 2150000, 3250000,
    [
        ("TourAPI 4.0 & Leaflet", True, 15.5, RGBColor(17, 94, 89), PP_ALIGN.CENTER),
        ("장소 큐레이션 및 지도 표출", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("• 관광·숙박·식음 3단계 분류 매핑", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 여행자 취향 키워드 가중치 랭킹", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 고화질 썸네일 & 상세 주소 결합", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• Leaflet 지도 타임라인 시각화", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 누락 시 전국 20개 거점 Fallback", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL
)
add_right_arrow(slide7, 10540000, 3350000, 320000, 480000)

# 8) Final Result (최종 결과)
add_rounded_box(
    slide7, 10910000, 2400000, 800000, 2400000,
    [
        ("최종", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("여행", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("일정", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("표출", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)

# Stage 2 하단 라벨 (Slide 12의 TextBox 35)
lbl_st2 = slide7.shapes.add_textbox(7000000, 5501366, 4200000, 882293)
p2 = lbl_st2.text_frame.paragraphs[0]
setup_text(p2, "Stage 2\n선형 보간 타임라인 및 길목 명소 큐레이션", font_size=16, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER)

print("  -> Slide 7 Native Diagram Complete!")


# =============================================================================
# 2. SLIDE 15: CI/CD (Slide 12 Multi-stage Architecture 스타일)
# =============================================================================
print("\n[2] Building Native Shapes for Slide 15...")
slide15 = prs.slides[15]

for s in list(slide15.shapes):
    if s.name not in ["슬라이드 번호 개체 틀 1", "TextBox 3", "직선 연결선 2"]:
        sp = s._element
        sp.getparent().remove(sp)

for s in slide15.shapes:
    if s.name == "TextBox 3":
        s.width = 6500000
        s.text_frame.text = "CI/CD"
        p = s.text_frame.paragraphs[0]
        p.font.name = "Malgun Gothic"
        p.font.size = Pt(28)
        p.font.bold = True
        p.font.color.rgb = RGBColor(34, 59, 107)

# 서브타이틀 추가
sub15 = slide15.shapes.add_textbox(664358, 1197015, 6500000, 494494)
p_sub15 = sub15.text_frame.paragraphs[0]
setup_text(p_sub15, "Two-stage Continuous Integration & Deployment Architecture", font_size=18, bold=True, color=COLOR_TEXT_MUTED, align=PP_ALIGN.LEFT)

# 중앙 스테이지 구분선
line15 = slide15.shapes.add_shape(MSO_SHAPE.RECTANGLE, 5450000, 1900000, Pt(1.5), 3500000)
line15.fill.solid()
line15.fill.fore_color.rgb = COLOR_LINE_GRAY
line15.line.fill.background()

# --- Stage 1 (좌측): GitHub Cloud CI 사전 격리 빌드 ---
# 1) Input Node (main push)
add_rounded_box(
    slide15, 500000, 2400000, 1000000, 2400000,
    [
        ("개발자 푸시", True, 15, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("git push\norigin main", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("Path-based\n자동 감지", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)
add_right_arrow(slide15, 1550000, 3350000, 320000, 480000)

# 2) Process 1-A (Cloud Runner)
add_rounded_box(
    slide15, 1920000, 2050000, 2000000, 1500000,
    [
        ("GitHub Cloud Runner", True, 14.5, RGBColor(6, 78, 59), PP_ALIGN.CENTER),
        ("ubuntu-latest 사전 격리 환경", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• EC2 운영 서버 리소스 부하 0%", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• concurrency: 중복 빌드 즉시 취소", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• npm cache로 의존성 빌드 가속", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)

# 3) Process 1-B (TypeScript 컴파일 & Fail-Fast 검증)
add_rounded_box(
    slide15, 1920000, 3800000, 2000000, 1500000,
    [
        ("정적 검증 & Vite 빌드", True, 14.5, RGBColor(17, 94, 89), PP_ALIGN.CENTER),
        ("Fail-Fast 조기 방어 체계", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• TypeScript tsc 엄격 타입 검사", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• Vite 프로덕션 dist/ 번들 생성", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 에러 시 즉시 중단 & PR Red X", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL
)
add_right_arrow(slide15, 3970000, 3350000, 320000, 480000)

# 4) Output 1 (빌드 산출물 아티팩트)
add_rounded_box(
    slide15, 4340000, 2400000, 950000, 2400000,
    [
        ("빌드\n아티팩트", True, 15, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("upload-\nartifact\n저장", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("검증 완료된\ndist/ 번들", False, 13, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)

# Stage 1 하단 라벨 (Slide 12의 TextBox 32)
lbl_st1_15 = slide15.shapes.add_textbox(1100000, 5501366, 3500000, 882293)
p1_15 = lbl_st1_15.text_frame.paragraphs[0]
setup_text(p1_15, "Stage 1\nGitHub Cloud 사전 격리 빌드 (CI)", font_size=16, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER)

# --- Stage 2 (우측): AWS EC2 Self-Hosted CD & Docker 무중단 배포 ---
add_right_arrow(slide15, 5340000, 3350000, 320000, 480000)

# 5) Process 2-A (EC2 Self-Hosted 러너 보안 통신)
add_rounded_box(
    slide15, 5720000, 2050000, 2200000, 1500000,
    [
        ("EC2 Self-Hosted Runner", True, 14.5, RGBColor(6, 78, 59), PP_ALIGN.CENTER),
        ("인하우스 데몬 보안 배포", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• 외부 SSH(22) 포트 미개방 통신", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 아웃바운드 Polling 방식으로 수신", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• clean: false로 .env 환경변수 보존", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)

# 6) Process 2-B (사전 스냅샷 백업 & Docker prune)
add_rounded_box(
    slide15, 5720000, 3800000, 2200000, 1500000,
    [
        ("사전 백업 & 핫스왑 교체", True, 14.5, RGBColor(6, 78, 59), PP_ALIGN.CENTER),
        ("무손실 백업 및 원자적 롤아웃", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("• 기존 폴더 backups/ 압축 백업", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• docker compose up -d --no-deps", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• Nginx 프록시 reload 0초 다운타임", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)
add_right_arrow(slide15, 7970000, 3350000, 320000, 480000)

# 7) Process 2-C (헬스체크 & 불사조 자가 치유)
add_rounded_box(
    slide15, 8340000, 2050000, 2150000, 3250000,
    [
        ("헬스체크 & 불사조 자가 치유", True, 15.5, RGBColor(17, 94, 89), PP_ALIGN.CENTER),
        ("자가 복구 및 데이터 격리", False, 12, COLOR_TEXT_MUTED, PP_ALIGN.CENTER),
        ("", False, 8, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("• /api/health 엔드포인트 5회 검증", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 실패 시 docker logs 덤프 & 롤백", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• restart: always 정책 3초 내 부활", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• PostgreSQL 호스트 격리 DB 무중단", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
        ("• 연중 무휴 가용성(SLA) 99.9% 유지", False, 12.5, COLOR_TEXT_MAIN, PP_ALIGN.LEFT),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL
)
add_right_arrow(slide15, 10540000, 3350000, 320000, 480000)

# 8) Final Result
add_rounded_box(
    slide15, 10910000, 2400000, 800000, 2400000,
    [
        ("무중단", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("자동", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("배포", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
        ("완료", True, 16, COLOR_TEXT_MAIN, PP_ALIGN.CENTER),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)

# Stage 2 하단 라벨 (Slide 12의 TextBox 35)
lbl_st2_15 = slide15.shapes.add_textbox(7000000, 5501366, 4200000, 882293)
p2_15 = lbl_st2_15.text_frame.paragraphs[0]
setup_text(p2_15, "Stage 2\nEC2 인하우스 러너 무중단 롤아웃 (CD)", font_size=16, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER)

print("  -> Slide 15 Native Diagram Complete!")

# 저장
prs.save(PPT_PATH)
print(f"\n[성공] 원본 프레젠테이션에 Native PowerPoint 다이어그램 적용 완료: {PPT_PATH}")
