# -*- coding: utf-8 -*-
"""
build_complete_backend_presentation.py
1. Slide 7: 화살표를 슬림한 화살표 연결선(Line+Arrowhead)으로 교체
2. Slide 7과 Slide 8 사이에 3개의 백엔드 핵심 슬라이드 추가:
   - Slide 8: BackEnd – 여행 경로 생성 (핵심 코드: ORS 연동 & 선형 보간 알고리즘)
   - Slide 9: BackEnd – 여행지 추천 로직 (아키텍처 다이어그램: 공간 인덱싱 & TourAPI/AI 큐레이션)
   - Slide 10: BackEnd – 여행지 추천 로직 (핵심 코드: 점-선분 최단거리 & Gemini 프롬프트 제약)
3. CI/CD 슬라이드: 화살표를 슬림한 화살표 연결선으로 교체
4. 모든 슬라이드 페이지 번호 동기화 (1 ~ N)
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN
from pptx.oxml import parse_xml

PPT_PATH = r"c:\furiosa-miniproject\FURIOSA_BOOTCAMP_miniproject\퓨리오사AIagent스쿨_미니프로젝트_IamyourJ_final_이지석_장동율.pptx"

prs = Presentation(PPT_PATH)

# 컬러 팔레트 (Slide 12와 100% 일치)
COLOR_MINT_LIGHT  = RGBColor(221, 248, 242) # #DDF8F2
COLOR_MINT_DARK   = RGBColor(162, 236, 220) # #A2ECDC
COLOR_WHITE       = RGBColor(255, 255, 255) # #FFFFFF
COLOR_CODE_BG     = RGBColor(248, 250, 252) # #F8FAFC
COLOR_BORDER_GRAY = RGBColor(148, 163, 184) # #94A3B8
COLOR_BORDER_MINT = RGBColor(94, 234, 212)  # #5EEAD4
COLOR_BORDER_TEAL = RGBColor(45, 212, 191)  # #2DD4BF
COLOR_TEXT_MAIN   = RGBColor(15, 23, 42)    # #0F172A
COLOR_TEXT_TITLE  = RGBColor(34, 59, 107)   # #223B6B
COLOR_TEXT_MUTED  = RGBColor(71, 85, 105)   # #475569
COLOR_ARROW       = RGBColor(13, 148, 136)  # #0D9488
COLOR_LINE_GRAY   = RGBColor(203, 213, 225) # #CBD5E1

def clean_str(s):
    if not s:
        return ""
    return str(s).replace('\r', '').replace('\n', '').replace('\x0b', '').strip()

def setup_para(p, text, font_size=15, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER):
    p.text = clean_str(text)
    p.font.name = "Malgun Gothic"
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align

def add_clean_box(slide, left, top, width, height, text_items, fill_color, border_color=None, align=PP_ALIGN.CENTER):
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
    tf.margin_left = Inches(0.08)
    tf.margin_right = Inches(0.08)
    tf.margin_top = Inches(0.08)
    tf.margin_bottom = Inches(0.08)
    
    is_first = True
    for item in text_items:
        line, is_bold, sz, col = item
        clean_text = clean_str(line)
        p = tf.paragraphs[0] if is_first else tf.add_paragraph()
        is_first = False
        if not clean_text:
            setup_para(p, "", font_size=4, bold=False, color=col)
        else:
            setup_para(p, clean_text, font_size=sz, bold=is_bold, color=col, align=align)
    return shape

def add_arrow_line(slide, x1, y1, x2, y2, color=COLOR_ARROW):
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    conn.line.color.rgb = color
    conn.line.width = Pt(2.5)
    tail = parse_xml('<a:tailEnd xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="triangle" w="med" len="med"/>')
    conn.line._ln.append(tail)
    return conn

def setup_stage_label(slide, left, top, width, height, stage_title, stage_desc):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    p0 = tf.paragraphs[0]
    setup_para(p0, clean_str(stage_title), font_size=17, bold=True, color=COLOR_TEXT_MAIN, align=PP_ALIGN.CENTER)
    p1 = tf.add_paragraph()
    setup_para(p1, clean_str(stage_desc), font_size=14, bold=False, color=COLOR_TEXT_MUTED, align=PP_ALIGN.CENTER)
    return tb

def setup_header(slide, title_text, sub_text, page_num):
    # 페이지 번호
    num_box = slide.shapes.add_textbox(9136811, 182562, 2743200, 365125)
    setup_para(num_box.text_frame.paragraphs[0], str(page_num), font_size=24, bold=False, color=COLOR_TEXT_MUTED, align=PP_ALIGN.RIGHT)
    
    # 상단 구분선
    line = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, 0, 1136073, 12192000, 1136073)
    line.line.color.rgb = COLOR_TEXT_TITLE
    line.line.width = Pt(1.5)
    
    # 제목
    t_box = slide.shapes.add_textbox(321231, 208112, 6500000, 707886)
    setup_para(t_box.text_frame.paragraphs[0], title_text, font_size=28, bold=True, color=COLOR_TEXT_TITLE, align=PP_ALIGN.LEFT)
    
    # 소제목
    s_box = slide.shapes.add_textbox(664358, 1197015, 6500000, 494494)
    setup_para(s_box.text_frame.paragraphs[0], sub_text, font_size=18, bold=True, color=COLOR_TEXT_MUTED, align=PP_ALIGN.LEFT)

# =============================================================================
# 1. Slide 7 화살표 선 정리
# =============================================================================
slide7 = prs.slides[7]
for s in list(slide7.shapes):
    if s.shape_type in [5, 33] or "화살표" in s.name or "Arrow" in s.name or (s.shape_type == 1 and s.width < 400000 and s.height < 500000):
        sp = s._element
        sp.getparent().remove(sp)
    # 기존 가로 연결선도 중복 방지를 위해 삭제 후 재생성
    if s.shape_type == 9 and s.height == 0 and s.top > 2000000:
        sp = s._element
        sp.getparent().remove(sp)

Y_MID = 3755000
add_arrow_line(slide7, 1090000, Y_MID, 1480000, Y_MID)
add_arrow_line(slide7, 3560000, Y_MID, 3950000, Y_MID)
add_arrow_line(slide7, 4930000, Y_MID, 5340000, Y_MID)
add_arrow_line(slide7, 7570000, Y_MID, 7960000, Y_MID)
add_arrow_line(slide7, 10240000, Y_MID, 10630000, Y_MID)
print("Slide 7 arrow lines updated cleanly!")

# =============================================================================
# 2. 3개의 신규 슬라이드 생성 (Slide 8, 9, 10)
# =============================================================================
blank_layout = prs.slide_layouts[6]

# Helper to create and position slide
def create_inserted_slide(target_idx):
    s = prs.slides.add_slide(blank_layout)
    sldId = prs.slides._sldIdLst[-1]
    prs.slides._sldIdLst.remove(sldId)
    prs.slides._sldIdLst.insert(target_idx, sldId)
    return s

# --- SLIDE 8: BackEnd – 여행 경로 생성 (핵심 코드) ---
slide8 = create_inserted_slide(8)
setup_header(slide8, "BackEnd – 여행 경로 생성", "OpenRouteService 연동 및 타임라인 선형 보간 알고리즘", 8)

# Left: 3 Cards (높이 1200000씩)
add_clean_box(
    slide8, 664358, 1850000, 4200000, 1300000,
    [
        ("1단계 : 24h 캐시 및 ORS 엔진 연동", True, 16, RGBColor(6, 78, 59)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("• 출발·도착 좌표 SHA-256 해시 키 검증으로 캐시 히트(10ms)", False, 13, COLOR_TEXT_MAIN),
        ("• 캐시 미스 시 OpenRouteService 호출 (호출량 85% 절감)", False, 13, COLOR_TEXT_MAIN),
        ("• 권장 경로(Driving-Car) 및 최단 대안 경로 동시 산출", False, 12, COLOR_TEXT_MUTED),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT, align=PP_ALIGN.LEFT
)

add_clean_box(
    slide8, 664358, 3350000, 4200000, 1300000,
    [
        ("2단계 : GeoJSON 도로 궤적 수집", True, 16, RGBColor(17, 94, 89)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("• 수천 개의 도로 곡면 위·경도 좌표열(LineString) 수신", False, 13, COLOR_TEXT_MAIN),
        ("• 프론트엔드 Leaflet 지도 라이브러리와 실시간 바인딩", False, 13, COLOR_TEXT_MAIN),
        ("• 실제 고속도로/국도 형상 그대로 매끄러운 궤적 표출", False, 12, COLOR_TEXT_MUTED),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL, align=PP_ALIGN.LEFT
)

add_clean_box(
    slide8, 664358, 4850000, 4200000, 1500000,
    [
        ("3단계 : 타임라인 선형 보간 (Linear Interpolation)", True, 16, RGBColor(6, 78, 59)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("• 도로 구간별 소요 시간(timeSpans)을 누적 합산", False, 13, COLOR_TEXT_MAIN),
        ("• 비례식(alpha)으로 특정 시점(예: 12:30 점심) 통과 지점 역산", False, 13, COLOR_TEXT_MAIN),
        ("• 길목 맛집 및 휴게소 추천의 정확한 위경도 기준점 제공", False, 12, COLOR_TEXT_MUTED),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT, align=PP_ALIGN.LEFT
)

# Right: Code Box
add_clean_box(
    slide8, 5100000, 1850000, 6427642, 4500000,
    [
        ("/* timeline-calculator.ts — 선형 보간 좌표 역산 */", True, 13, RGBColor(13, 148, 136)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("export function findCoordinateAtElapsedSeconds(", True, 14, COLOR_TEXT_TITLE),
        ("  coordinates: Coordinate[], timeSpans: TimeSpan[],", False, 13, COLOR_TEXT_MAIN),
        ("  totalDuration: number, elapsedSeconds: number", False, 13, COLOR_TEXT_MAIN),
        ("): Coordinate {", True, 14, COLOR_TEXT_TITLE),
        ("  let cumulative = 0;", False, 13, COLOR_TEXT_MAIN),
        ("  for (const span of timeSpans) {", False, 13, COLOR_TEXT_MAIN),
        ("    const prev = cumulative;", False, 13, COLOR_TEXT_MAIN),
        ("    cumulative += span.durationSeconds;", False, 13, COLOR_TEXT_MAIN),
        ("    if (cumulative >= elapsedSeconds) {", True, 13, RGBColor(6, 78, 59)),
        ("      // 비례 계수(alpha) 계산", False, 12, COLOR_TEXT_MUTED),
        ("      const alpha = (elapsedSeconds - prev) / span.durationSeconds;", True, 13, RGBColor(180, 83, 9)),
        ("      const pFrom = coordinates[span.fromIndex];", False, 13, COLOR_TEXT_MAIN),
        ("      const pTo   = coordinates[span.toIndex];", False, 13, COLOR_TEXT_MAIN),
        ("      // 위도·경도 선형 보간", False, 12, COLOR_TEXT_MUTED),
        ("      const lon = pFrom[0] + alpha * (pTo[0] - pFrom[0]);", True, 13, RGBColor(4, 120, 87)),
        ("      const lat = pFrom[1] + alpha * (pTo[1] - pFrom[1]);", True, 13, RGBColor(4, 120, 87)),
        ("      return [round(lon, 7), round(lat, 7)];", False, 13, COLOR_TEXT_MAIN),
        ("    }", False, 13, COLOR_TEXT_MAIN),
        ("  }", False, 13, COLOR_TEXT_MAIN),
        ("  return coordinates[coordinates.length - 1];", False, 13, COLOR_TEXT_MAIN),
        ("}", True, 14, COLOR_TEXT_TITLE),
    ],
    COLOR_CODE_BG, COLOR_BORDER_GRAY, align=PP_ALIGN.LEFT
)


# --- SLIDE 9: BackEnd – 여행지 추천 로직 (아키텍처 다이어그램) ---
slide9 = create_inserted_slide(9)
setup_header(slide9, "BackEnd – 여행지 추천 로직", "Multi-stage Spot Filtering & AI Curation Architecture", 9)

# 중앙 구분선
line9 = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, 5050000, 1950000, Pt(1.5), 3450000)
line9.fill.solid()
line9.fill.fore_color.rgb = COLOR_LINE_GRAY
line9.line.fill.background()

# Stage 1 (좌측)
add_clean_box(
    slide9, 500000, 2180000, 580000, 3150000,
    [
        ("경", True, 16, COLOR_TEXT_MAIN),
        ("로", True, 16, COLOR_TEXT_MAIN),
        ("좌", True, 16, COLOR_TEXT_MAIN),
        ("표", True, 16, COLOR_TEXT_MAIN),
        ("열", True, 16, COLOR_TEXT_MAIN),
        ("", False, 6, COLOR_TEXT_MAIN),
        ("(GeoJSON)", False, 11, COLOR_TEXT_MUTED),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)
add_arrow_line(slide9, 1090000, Y_MID, 1480000, Y_MID)

add_clean_box(
    slide9, 1500000, 2180000, 2050000, 1460000,
    [
        ("RouteProximity 평면 투영", True, 16, RGBColor(6, 78, 59)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("(Equirectangular Projection)", False, 12, COLOR_TEXT_MUTED),
        ("곡면 위경도를 직교 지역 평면 변환", False, 12, RGBColor(4, 120, 87)),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)

add_clean_box(
    slide9, 1500000, 3870000, 2050000, 1460000,
    [
        ("공간 그리드 인덱싱", True, 16, RGBColor(17, 94, 89)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("(Spatial Grid Index)", False, 13, COLOR_TEXT_MUTED),
        ("도로변 5km 이내 후보군 30ms 추출", False, 12, RGBColor(13, 148, 136)),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL
)
add_arrow_line(slide9, 3560000, Y_MID, 3950000, Y_MID)

add_clean_box(
    slide9, 3970000, 2180000, 950000, 3150000,
    [
        ("반경 5km", True, 15.5, COLOR_TEXT_MAIN),
        ("후보", True, 15.5, COLOR_TEXT_MAIN),
        ("장소군", True, 15.5, COLOR_TEXT_MAIN),
        ("", False, 8, COLOR_TEXT_MAIN),
        ("(Places Pool)", False, 12, COLOR_TEXT_MUTED),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)

setup_stage_label(slide9, 1100000, 5450000, 3200000, 882293, "Stage 1", "공간 인덱싱 기반 경로변 5km 후보지 고속 추출")

# Stage 2 (우측)
add_arrow_line(slide9, 4930000, Y_MID, 5340000, Y_MID)

add_clean_box(
    slide9, 5360000, 2180000, 2200000, 1460000,
    [
        ("TourAPI 4.0 계층 분류", True, 16, RGBColor(6, 78, 59)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("(관광·숙박·맛집 3단계 트리)", False, 13, COLOR_TEXT_MUTED),
        ("ContentTypeId 39/12/32 정밀 선별", False, 12, RGBColor(4, 120, 87)),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)

add_clean_box(
    slide9, 5360000, 3870000, 2200000, 1460000,
    [
        ("Gemini 2.5 Flash 취향 매핑", True, 16, RGBColor(17, 94, 89)),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("(LLM 지능형 테마 큐레이션)", False, 13, COLOR_TEXT_MUTED),
        ("여행자 스타일 분석 & 맞춤 선별", False, 12, RGBColor(13, 148, 136)),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL
)
add_arrow_line(slide9, 7570000, Y_MID, 7960000, Y_MID)

add_clean_box(
    slide9, 7980000, 2180000, 2250000, 3150000,
    [
        ("동선 기반 시간표 조율", True, 17, RGBColor(6, 78, 59)),
        ("& 1일 6곳 최적화", True, 17, RGBColor(6, 78, 59)),
        ("", False, 10, COLOR_TEXT_MAIN),
        ("출발·도착 시간 기준 역산", False, 13, COLOR_TEXT_MAIN),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("점심/저녁 09:00~20:00 배치", False, 13, COLOR_TEXT_MAIN),
        ("", False, 4, COLOR_TEXT_MAIN),
        ("체류시간 30~180분 정밀 할당", False, 13, COLOR_TEXT_MAIN),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT
)
add_arrow_line(slide9, 10240000, Y_MID, 10630000, Y_MID)

add_clean_box(
    slide9, 10650000, 2180000, 950000, 3150000,
    [
        ("최종", True, 16, COLOR_TEXT_MAIN),
        ("여행", True, 16, COLOR_TEXT_MAIN),
        ("일정", True, 16, COLOR_TEXT_MAIN),
        ("완성", True, 16, COLOR_TEXT_MAIN),
        ("", False, 8, COLOR_TEXT_MAIN),
        ("(타임라인)", False, 12.5, COLOR_TEXT_MUTED),
    ],
    COLOR_WHITE, COLOR_BORDER_GRAY
)

setup_stage_label(slide9, 7000000, 5450000, 4000000, 882293, "Stage 2", "TourAPI 계층 필터링 및 Gemini AI 맞춤 일정 큐레이션")


# --- SLIDE 10: BackEnd – 여행지 추천 로직 (핵심 코드) ---
slide10 = create_inserted_slide(10)
setup_header(slide10, "BackEnd – 여행지 추천 로직", "공간 점-선분 최단거리 최적화 및 Gemini 2.5 Flash 프롬프트 제약", 10)

# Left: 2 Cards
add_clean_box(
    slide10, 664358, 1850000, 4200000, 2150000,
    [
        ("1. RouteProximity 점-선분 수직거리 최적화", True, 16, RGBColor(6, 78, 59)),
        ("", False, 6, COLOR_TEXT_MAIN),
        ("• Equirectangular 평면 투영으로 구면 왜곡 보정", False, 13, COLOR_TEXT_MAIN),
        ("• 선분 투영 매개변수 t를 [0, 1] 클램핑하여 수직 발 좌표 계산", False, 13, COLOR_TEXT_MAIN),
        ("• 도로변 인접 그리드 해시 룩업으로 O(1) 공간 탐색", False, 13, COLOR_TEXT_MAIN),
        ("• 50만 회 연산 상한 안전 가드로 서버 무한 루프 원천 차단", False, 12, RGBColor(4, 120, 87)),
    ],
    COLOR_MINT_LIGHT, COLOR_BORDER_MINT, align=PP_ALIGN.LEFT
)

add_clean_box(
    slide10, 664358, 4200000, 4200000, 2150000,
    [
        ("2. Gemini 2.5 Flash 엄격 프롬프트 & 스키마", True, 16, RGBColor(17, 94, 89)),
        ("", False, 6, COLOR_TEXT_MAIN),
        ("• '제공된 places의 ID만 사용하고 새로운 장소 날조 금지'", False, 13, COLOR_TEXT_MAIN),
        ("• 존재하지 않는 유령 식당/장소 생성(Hallucination) 0% 차단", False, 13, COLOR_TEXT_MAIN),
        ("• 1일 최대 6곳, 09:00~20:00 동선 체류시간 엄격 제한", False, 13, COLOR_TEXT_MAIN),
        ("• responseMimeType: 'application/json'으로 파싱 무결성 보장", False, 12, RGBColor(13, 148, 136)),
    ],
    COLOR_MINT_DARK, COLOR_BORDER_TEAL, align=PP_ALIGN.LEFT
)

# Right: Code Box
add_clean_box(
    slide10, 5100000, 1850000, 6427642, 4500000,
    [
        ("/* route-proximity.ts — 점과 도로 선분 간 최단거리 계산 */", True, 13, RGBColor(13, 148, 136)),
        ("const t = s.squared === 0 ? 0 : Math.max(0, Math.min(1,", False, 12.5, COLOR_TEXT_MAIN),
        ("  ((point[0] - s.start[0]) * s.dx + (point[1] - s.start[1]) * s.dy) / s.squared", True, 13, RGBColor(180, 83, 9)),
        ("));", False, 12.5, COLOR_TEXT_MAIN),
        ("const dx = point[0] - s.start[0] - t * s.dx;", False, 12.5, COLOR_TEXT_MAIN),
        ("const dy = point[1] - s.start[1] - t * s.dy;", False, 12.5, COLOR_TEXT_MAIN),
        ("return Math.sqrt(dx * dx + dy * dy); // 도로와의 수직거리(m)", True, 13, RGBColor(4, 120, 87)),
        ("", False, 6, COLOR_TEXT_MAIN),
        ("/* destination-curator.ts — Gemini 2.5 Flash 제약 프롬프트 */", True, 13, RGBColor(13, 148, 136)),
        ("const response = await gemini.ai.models.generateContent({", False, 12.5, COLOR_TEXT_MAIN),
        ("  model: gemini.modelName,", False, 12.5, COLOR_TEXT_MAIN),
        ("  contents: JSON.stringify({ travelStyle, places, arrivalTime }),", False, 12.5, COLOR_TEXT_MAIN),
        ("  config: {", False, 12.5, COLOR_TEXT_MAIN),
        ("    systemInstruction:", True, 13, COLOR_TEXT_TITLE),
        ("      '당신은 국내 여행 일정 큐레이터입니다. 제공된 places의 ID만 사용하고',", False, 12, RGBColor(6, 78, 59)),
        ("      '새로운 장소를 절대 만들지 마세요. 하루 최대 6곳, 09:00~20:00에 배치하세요.',", False, 12, RGBColor(6, 78, 59)),
        ("    responseMimeType: 'application/json'", True, 13, RGBColor(180, 83, 9)),
        ("  }", False, 12.5, COLOR_TEXT_MAIN),
        ("});", False, 12.5, COLOR_TEXT_MAIN),
    ],
    COLOR_CODE_BG, COLOR_BORDER_GRAY, align=PP_ALIGN.LEFT
)

# =============================================================================
# 3. Slide 18 (기존 Slide 15 CI/CD) 화살표 선 정리
# =============================================================================
slide_cicd = prs.slides[18]
for s in list(slide_cicd.shapes):
    if s.shape_type in [5, 33] or "화살표" in s.name or "Arrow" in s.name or (s.shape_type == 1 and s.width < 400000 and s.height < 500000):
        sp = s._element
        sp.getparent().remove(sp)
    if s.shape_type == 9 and s.height == 0 and s.top > 2000000:
        sp = s._element
        sp.getparent().remove(sp)

add_arrow_line(slide_cicd, 1090000, Y_MID, 1480000, Y_MID)
add_arrow_line(slide_cicd, 3560000, Y_MID, 3950000, Y_MID)
add_arrow_line(slide_cicd, 4930000, Y_MID, 5340000, Y_MID)
add_arrow_line(slide_cicd, 7570000, Y_MID, 7960000, Y_MID)
add_arrow_line(slide_cicd, 10240000, Y_MID, 10630000, Y_MID)
print("Slide 18 (CI/CD) arrow lines updated cleanly!")

# =============================================================================
# 4. 전체 슬라이드 페이지 번호 동기화 (1 ~ N)
# =============================================================================
for idx, slide in enumerate(prs.slides):
    if idx == 0:
        continue
    for s in slide.shapes:
        if s.name == "슬라이드 번호 개체 틀 1":
            s.text_frame.text = str(idx)

prs.save(PPT_PATH)
print("Complete Presentation saved successfully with all 4 backend slides!")
