# -*- coding: utf-8 -*-
import os, time, shutil, tempfile
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

# 타이틀
ax.text(50, 96.2, "PostgreSQL 16 & PostGIS 지리공간 RDBMS 아키텍처", 
        fontsize=25, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "EC2 Host Native 직접 설치  ·  EBS GP3 SSD  ·  GiST 공간 인덱스  ·  24시간 경로 캐시", 
        fontsize=14.0, color='#475569', ha='center', va='center')

box_w = 28.0
box_h = 51.0
gap_x = 5.5
start_x = 2.5

# STEP 01
x1 = start_x
draw_box(x1, 37.5, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 82.8, box_w - 2.0, 4.6, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 85.1, "STEP 01. Host Native & EBS SSD", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "EC2 Native 직접 설치", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_a = "• 도커 가상화 배제 (I/O 극대화)\n• 컨테이너 재시작과 분리 가동\n• 로컬 소켓 통신 (0ms 레이턴시)"
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "Amazon EBS GP3 SSD", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_b = "• /var/lib/postgresql 독립 마운트\n• 3,000 IOPS 고성능 스토리지\n• AWS KMS AES-256 디스크 암호화"
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. PostGIS 공간 인덱싱", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "GiST R-Tree 공간 인덱스", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = "• idx_tour_places_geom GiST\n• ST_DWithin 5km 버퍼 질의\n• 5만 POI 중 30ms 초고속 추출"
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "WGS84 공간 지오메트리", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = "• EPSG:4326 표준 위경도 좌표계\n• Point 명소 & LineString 경로\n• 최단 수직 거리 연산 최적화"
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. 4대 핵심 테이블 스키마", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "명소 & 경로 캐시 테이블", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_a = "• tour_places: 5만건 POI 적재\n• ors_route_cache: SHA-256 캐시\n• 외부 호출 85% 대폭 절감"
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "AI 모델 & 챗 세션 테이블", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_b = "• model_artifacts: 가중치 보관\n• chat_sessions: 취향 세션 유지\n• 무중단 실시간 쿼리 보장"
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 화살표
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="공간 확장 적재", label_offset=(0, 2.8), fontsize=12.0)
draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#EA580C', width=2.8, 
           label="초고속 공간 질의", label_offset=(0, 2.8), fontsize=12.0)

# 하단 박스
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "PostgreSQL 16 프로덕션 무결성 · 고성능 파라미터 최적화", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. 공유 버퍼 메모리 튜닝", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = "• shared_buffers = 25% RAM\n• work_mem & maintenance 설정\n• GiST 인덱스 메모리 고속 캐싱"
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. WAL & 자동 아카이빙", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = "• WAL wal_level = replica\n• 매일 새벽 04시 자동 백업\n• 장애 시 특정 시점 즉시 복원(PITR)"
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. 연결 풀링 & 보안 격리", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = "• max_connections 최적 제어\n• 5432 외부 인바운드 차단\n• SCRAM-SHA-256 강력 암호화"
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="커널 파라미터 & 메모리 버퍼", label_pos=0.5, label_offset=(15.0, 0), fontsize=12.0)

output_path = "diagram_rdbms_storage.png"
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

print(f"[SUCCESS] {output_path}")
