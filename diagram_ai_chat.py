# -*- coding: utf-8 -*-
"""
대화형 AI & LLM 플래너 아키텍처 다이어그램 (화이트 테마 · 대형 폰트 · 핵심 요약 · 텍스트 넘침 완전 방지)
"""

import os
import time
import shutil
import tempfile
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

fig = plt.figure(figsize=(22, 12), dpi=250, facecolor='#FFFFFF')
ax = fig.add_subplot(111)
ax.set_facecolor('#FFFFFF')
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

def draw_box(x, y, w, h, bg_color, border_color, border_width=2.5, radius=1.0):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.0,rounding_size={radius}",
        facecolor=bg_color,
        edgecolor=border_color,
        linewidth=border_width,
        zorder=2
    )
    ax.add_patch(box)
    return box

def draw_arrow(start, end, color='#0284C7', width=2.8, label="", label_pos=0.5, label_offset=(0, 2.2), fontsize=12.0):
    arrow = patches.FancyArrowPatch(
        start, end,
        arrowstyle="-|>",
        color=color,
        linewidth=width,
        mutation_scale=18,
        zorder=4
    )
    ax.add_patch(arrow)
    if label:
        mid_x = start[0] + (end[0] - start[0]) * label_pos + label_offset[0]
        mid_y = start[1] + (end[1] - start[1]) * label_pos + label_offset[1]
        ax.text(
            mid_x, mid_y, label,
            color='#0F172A', fontsize=fontsize, fontweight='bold',
            ha='center', va='center', zorder=5,
            bbox=dict(boxstyle="round,pad=0.28", facecolor="#FFFFFF", edgecolor=color, alpha=0.98, lw=1.5)
        )

# -----------------------------------------------------------------------------
# 타이틀 (큼직하고 명확하게)
# -----------------------------------------------------------------------------
ax.text(50, 96.2, "자연어 대화형 AI 플래너 & 지능형 취향 매핑 파이프라인", 
        fontsize=24, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "React 18 챗 UI  ·  NestJS 코디네이터  ·  Gemini 3.5 Flash  ·  TourAPI 표준 분류 매핑", 
        fontsize=14.0, color='#475569', ha='center', va='center')

# -----------------------------------------------------------------------------
# 상단 3단계 (가로 3열, 여백 없이 꽉 찬 카드)
# Y: 37.5 ~ 88.5 (Height: 51.0)
# -----------------------------------------------------------------------------
box_w = 28.0
box_h = 51.0
gap_x = 5.5
start_x = 2.5

# STEP 01
x1 = start_x
draw_box(x1, 37.5, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 82.8, box_w - 2.0, 4.6, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 85.1, "STEP 01. React 18 챗 인터랙션", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "여행 조건 4단계 수집", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_a = (
    "• 출발·도착지 & 일정 선택\n"
    "• 이동수단 (자차/도보 전용)\n"
    "• 여행자 선호 키워드 수집"
)
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "원클릭 칩 & UX 최적화", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_b = (
    "• 추천 키워드 선택 칩 제공\n"
    "• 미입력 항목 친절 가이드\n"
    "• 대화 히스토리 로컬 유지"
)
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. NestJS 세션 & 프롬프트", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "대화 세션 & 입력 정제", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = (
    "• 세션 UUID 기반 상태 관리\n"
    "• 이동수단(자차/도보) 검증\n"
    "• 타임아웃 시 룰 Fallback"
)
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "프롬프트 템플릿 & 제약", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = (
    "• 4구간 표준 JSON 스키마 주입\n"
    "• TourAPI 분류 코드 자동 매핑\n"
    "• 실존 명소 기반 추천 제약"
)
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. Gemini 3.5 Flash 추론", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "구조화된 JSON 스키마 생성", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_a = (
    "• Gemini 3.5 Flash 추론 연동\n"
    "• 타임라인 JSON 규격 엄격 준수\n"
    "• 경유지별 시간·추천사유 도출"
)
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "취향 -> TourAPI 매핑", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_b = (
    "• 바다뷰 카페 -> 음식점(39)\n"
    "• 역사 체험 -> 문화시설(14)\n"
    "• 힐링 산책 -> 관광지(12)"
)
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 헤더 간 수평 화살표 (텍스트 충돌 완전 배제)
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="여행 조건 전달", label_offset=(0, 2.8), fontsize=12.0)

draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#EA580C', width=2.8, 
           label="구조화 프롬프트", label_offset=(0, 2.8), fontsize=12.0)

# -----------------------------------------------------------------------------
# 하단: PostgreSQL 16 대화 세션 & AI 큐레이션 저장소
# Y: 4.5 ~ 30.5 (Height: 26.0)
# -----------------------------------------------------------------------------
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "PostgreSQL 16 DBMS  ·  대화 세션 & AI 큐레이션 저장소 (EC2 Native 직접 설치 + EBS SSD)", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. chat_sessions 세션 보관", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = (
    "• session_id: 고유 세션 식별자\n"
    "• user_preferences: 취향 데이터\n"
    "• 자차/도보 플래그 & 대화 히스토리"
)
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. prompt_templates 버전 관리", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = (
    "• version: 프롬프트 버전 (v1~v2)\n"
    "• system_instructions: LLM 규칙\n"
    "• 무중단 실시간 핫픽스 지원"
)
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. AI 추천 코스 캐싱 & 로깅", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = (
    "• 동일 일정 질의 시 10ms 즉답\n"
    "• Gemini 호출 70% 절감 (비용 최적화)\n"
    "• 토큰 소비량 & 레이턴시 모니터링"
)
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 수직 연결 화살표 (오프셋 15.0으로 중앙 라인 및 텍스트 침범 완전 배제)
draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="세션 및 템플릿 인출 / 캐시 저장", label_pos=0.5, label_offset=(15.0, 0), fontsize=11.5)

# 안전 저장
output_path = "diagram_ai_chat.png"
tmp_dir = tempfile.gettempdir()
tmp_file = os.path.join(tmp_dir, f"temp_{os.path.basename(output_path)}")
plt.savefig(tmp_file, dpi=250, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
plt.close(fig)

for _ in range(10):
    try:
        shutil.copy2(tmp_file, output_path)
        break
    except Exception:
        time.sleep(0.3)

if os.path.exists(tmp_file):
    try:
        os.remove(tmp_file)
    except Exception:
        pass

print(f"[SUCCESS] 대화형 AI 플래너 다이어그램 생성 완료: {output_path}")
