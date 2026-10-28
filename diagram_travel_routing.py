# -*- coding: utf-8 -*-
"""
여행 경로 최적화 & 길목 명소 큐레이션 아키텍처 다이어그램 (화이트 테마 · 대형 폰트 · 핵심 요약 · 텍스트 넘침 완전 방지)
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
ax.text(50, 96.2, "여행 이동 경로 최적화 & 길목 명소 큐레이션 파이프라인", 
        fontsize=24, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "OpenRouteService (자차/도보 전용)  ·  PostGIS 반경 5km 공간 질의  ·  TourAPI 4.0 연동  ·  Leaflet 타임라인", 
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
draw_box(x1, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 85.1, "STEP 01. ORS 최적 경로 탐색 & 캐싱", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "자차 & 도보 최적 경로", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t1_a = (
    "• 자차: 고속·간선 최단 시간\n"
    "• 도보: 안전 보행로 중심 탐색\n"
    "• 대중교통 배제 (단독 지원)"
)
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "SHA-256 24h 캐싱", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t1_b = (
    "• 출발·도착 64자 해시 생성\n"
    "• 10ms 초고속 즉시 캐시 반환\n"
    "• 외부 API 호출 85% 대폭 절감"
)
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. PostGIS 반경 5km 공간 질의", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "ST_DWithin 공간 버퍼 탐색", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = (
    "• 이동 경로 기준 5km 버퍼링\n"
    "• GiST 인덱스로 30ms 초고속 질의\n"
    "• 동선 이탈 없는 도로변 명소 추출"
)
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "취향 매핑 & 스마트 랭킹", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = (
    "• 여행자 키워드 가중치 점수화\n"
    "• 이동 진행률(%) 기준 4구간 배치\n"
    "• 우회 최소화 및 이동 피로도 절감"
)
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. TourAPI 연동 & 시각화", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "TourAPI 4.0 실시간 결합", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t3_a = (
    "• 관광(12)·문화(14)·식음(39) 매핑\n"
    "• 고화질 대표 이미지 & 좌표 결합\n"
    "• 누락 시 랜드마크 자동 Fallback"
)
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "Leaflet 지도 & 타임라인", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t3_b = (
    "• 고정밀 Polyline 경로 렌더링\n"
    "• 경유지 순서 변경 즉시 재연산\n"
    "• 총 주행거리·시간 실시간 대시보드"
)
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 헤더 간 수평 화살표 (텍스트 충돌 완전 배제)
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="경로 LineString", label_offset=(0, 2.8), fontsize=12.0)

draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#0284C7', width=2.8, 
           label="길목 명소 리스트", label_offset=(0, 2.8), fontsize=12.0)

# -----------------------------------------------------------------------------
# 하단: PostgreSQL 16 PostGIS 공간 RDBMS (EC2 Native + EBS)
# Y: 4.5 ~ 30.5 (Height: 26.0)
# -----------------------------------------------------------------------------
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "PostgreSQL 16 + PostGIS 공간 데이터베이스 (EC2 Native 직접 설치 + EBS GP3 SSD)", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. tour_places 공간 테이블", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = (
    "• 전국 5만건 한국관광공사 POI 적재\n"
    "• geom(Point, 4326) 공간 좌표 컬럼\n"
    "• 매주 야간 Cron 자동 동기화"
)
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. ors_route_cache 경로 캐시", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = (
    "• SHA-256 고유 핑거프린트 (PK)\n"
    "• GeoJSON LineString 경로 데이터\n"
    "• 24시간 TTL 자동 무결성 유지"
)
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. GiST 인덱스 초고속 연산", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = (
    "• GiST R-Tree 공간 인덱스 적용\n"
    "• ST_DWithin 풀스캔 완전 배제\n"
    "• NVMe SSD 직접 탑재 I/O 병목 제로"
)
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 수직 연결 화살표 (오프셋 15.0으로 중앙 라인 및 텍스트 침범 완전 배제)
draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="PostGIS 공간 버퍼 질의 & 캐시 읽기", label_pos=0.5, label_offset=(15.0, 0), fontsize=11.5)

# 안전 저장
output_path = "diagram_travel_routing.png"
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

print(f"[SUCCESS] 여행 경로 다이어그램 생성 완료: {output_path}")
