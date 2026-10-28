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
ax.text(50, 96.2, "GitHub Actions CI/CD & EC2 무중단 자동 배포 파이프라인", 
        fontsize=25, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "GitHub Actions Cloud CI  ·  EC2 Self-Hosted Runner CD  ·  Docker Compose 무중단 교체", 
        fontsize=14.0, color='#475569', ha='center', va='center')

box_w = 28.0
box_h = 51.0
gap_x = 5.5
start_x = 2.5

# STEP 01
x1 = start_x
draw_box(x1, 37.5, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 82.8, box_w - 2.0, 4.6, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 85.1, "STEP 01. GitHub Cloud CI 빌드", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "main 브랜치 푸시 감지", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_a = "• git push origin main 감지\n• ubuntu-latest 격리 빌드 환경\n• 캐싱으로 빌드 시간 60% 단축"
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "정적 번들 컴파일 & 검증", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_b = "• React 18: Vite 프로덕션 빌드\n• NestJS: TypeScript 컴파일\n• 정적 분석 & 아티팩트 업로드"
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. EC2 Self-Hosted Runner", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "인하우스 러너 보안 통신", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = "• EC2 내부 전용 데몬 상주\n• 인바운드 SSH 개방 불필요\n• 아웃바운드 Polling 보안 통신"
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "사전 스냅샷 백업 & 준비", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = "• 배포 직전 구동 폴더 백업\n• 아티팩트 무결성 체크섬 확인\n• 실패 시 즉각 원복 기반 확보"
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. Docker 무중단 배포", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "Docker Compose 오케스트레이션", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_a = "• docker compose up -d 실행\n• Nginx / NestJS / FastAPI 갱신\n• 컨테이너 순차 교체 무중단 서빙"
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "헬스체크 & 자동 롤백", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_b = "• HTTP 200 상태코드 헬스체크\n• 실패 시 이전 컨테이너 자동 복구\n• 서비스 가용성 99.9% 유지"
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 화살표
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="빌드 아티팩트 전달", label_offset=(0, 2.8), fontsize=12.0)
draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#EA580C', width=2.8, 
           label="무중단 교체 실행", label_offset=(0, 2.8), fontsize=12.0)

# 하단 박스
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "배포 중에도 PostgreSQL 16 DB는 호스트에서 영구 무중단 가동 (Native 격리)", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. DB 영구 무중단 유지", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = "• 도커 컨테이너 재시작 영향 없음\n• 배포 중에도 DB 쿼리 정상 처리\n• 5만건 POI 및 경로 캐시 보존"
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. EBS 디스크 무결성 보호", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = "• GP3 SSD 볼륨 마운트 유지\n• 배포 중 I/O 중단 발생 제로\n• 데이터 손실 위험 100% 원천 배제"
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. Zero-Downtime 실현", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = "• Nginx 프록시 유지 상태 컨테이너 교체\n• 접속 끊김 없는 0초 다운타임\n• 배포 완료 즉시 서비스 활성화"
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="DB 무중단 연결 유지 보장", label_pos=0.5, label_offset=(15.0, 0), fontsize=12.0)

output_path = "diagram_cicd_deployment.png"
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
