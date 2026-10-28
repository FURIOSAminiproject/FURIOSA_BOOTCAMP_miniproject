# -*- coding: utf-8 -*-
"""
외부 공공 & AI API 연동 아키텍처 다이어그램 (화이트 테마 · 대형 폰트 · 핵심 요약 · 텍스트 넘침 완전 방지)
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
ax.text(50, 96.2, "핵심 외부 공공 & AI API 연동 아키텍처", 
        fontsize=24, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "한국관광공사 TourAPI 4.0  ·  OpenRouteService (자차/도보)  ·  Google Gemini 3.5 Flash  ·  서킷 브레이커", 
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
ax.text(x1 + box_w/2, 85.1, "STEP 01. 한국관광공사 TourAPI 4.0", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "전국 관광 POI 수집", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_a = (
    "• 전국 5만건 관광 POI 수집\n"
    "• 매주 야간 Cron 자동 동기화\n"
    "• WGS84 좌표 & 대표 이미지 결합"
)
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "트래픽 최적화 & Fallback", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_b = (
    "• LRU 캐시로 호출 90% 절감\n"
    "• 지수 백오프 자동 재시도\n"
    "• 장애 시 로컬 DB 즉시 반환"
)
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. ORS 경로 & Gemini 3.5 Flash", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "ORS 최적 경로 (자차/도보)", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = (
    "• driving-car (고속·간선도로)\n"
    "• foot-walking (보행자 전용)\n"
    "• GeoJSON LineString 실시간 생성"
)
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "Google Gemini 3.5 Flash", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = (
    "• Gemini 3.5 Flash 실시간 호출\n"
    "• 구조화된 타임라인 JSON 추론\n"
    "• 토큰 압축 및 쿼터 비용 최적화"
)
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. 게이트웨이 & 트래픽 제어", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "서킷 브레이커 & 장애 격리", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_a = (
    "• 5회 연속 실패 시 서킷 OPEN\n"
    "• 30초 후 Half-Open 자동 복구\n"
    "• 외부 지연의 내부 전파 차단"
)
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "Rate-Limit & 쿼터 보호", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_b = (
    "• 토큰 버킷 알고리즘 적용\n"
    "• 분당 호출 제한으로 DoS 차단\n"
    "• 일일 무료 API 쿼터 고갈 방어"
)
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 헤더 간 수평 화살표 (텍스트 충돌 완전 배제)
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="명소 좌표 연동", label_offset=(0, 2.8), fontsize=12.0)

draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#EA580C', width=2.8, 
           label="트래픽 제어 연동", label_offset=(0, 2.8), fontsize=12.0)

# -----------------------------------------------------------------------------
# 하단: PostgreSQL 16 DBMS  ·  외부 API 응답 캐시 & 무결성 저장소
# Y: 4.5 ~ 30.5 (Height: 26.0)
# -----------------------------------------------------------------------------
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "PostgreSQL 16 DBMS  ·  외부 API 응답 캐시 저장소 (EC2 Native 직접 설치 + EBS SSD)", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. tour_places 명소 캐시", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = (
    "• 5만건 POI 데이터 로컬 보관\n"
    "• PostGIS 공간 질의 즉시 처리\n"
    "• 외부 API 장애 시 무중단 서빙"
)
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. ors_route_cache 경로 캐시", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = (
    "• SHA-256 경로 해시 (24h TTL)\n"
    "• 10ms 초고속 즉시 캐시 반환\n"
    "• 외부 ORS 호출 85% 대폭 절감"
)
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. API 트래픽 모니터링", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = (
    "• API별 응답 속도 & 에러율 추적\n"
    "• Gemini 토큰 소비량 실시간 집계\n"
    "• 장애 감지 시 알림 및 안전 롤백"
)
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 수직 연결 화살표 (오프셋 15.0으로 중앙 라인 및 텍스트 침범 완전 배제)
draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="캐시 인출 & 응답 적재", label_pos=0.5, label_offset=(15.0, 0), fontsize=11.5)

# 안전 저장
output_path = "diagram_external_api.png"
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

print(f"[SUCCESS] 외부 API 연동 다이어그램 생성 완료: {output_path}")
