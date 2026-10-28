# -*- coding: utf-8 -*-
import os, time, shutil, tempfile
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

fig = plt.figure(figsize=(22, 13), dpi=250, facecolor='#FFFFFF')
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
ax.text(50, 96.6, "I am your J  ·  AWS 클라우드 인프라 아키텍처", 
        fontsize=25, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 93.3, "AWS EC2 + EBS  ·  Docker 컨테이너 3종  ·  PostgreSQL 16 Host Native  ·  GitHub CI/CD", 
        fontsize=14.5, color='#475569', ha='center', va='center')

box_w = 28.0
box_h = 56.0
gap_x = 5.5
start_x = 2.5

# 1열: 클라이언트 & 연동
x1 = start_x
draw_box(x1, 33.0, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 84.4, box_w - 2.0, 4.4, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 86.6, "1. 클라이언트 & 외부 API", fontsize=15.5, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 67.4, box_w - 2.0, 15.6, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 81.4, "Web Browser (HTTPS)", fontsize=14.5, fontweight='bold', color='#0369A1', va='top')
t1_1 = "• React 18 반응형 UI\n• TLS 1.3 암호화 통신\n• Let's Encrypt SSL"
ax.text(x1 + 2.5, 77.8, t1_1, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

draw_box(x1 + 1.0, 50.4, box_w - 2.0, 15.6, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 64.4, "4대 공공 & AI API", fontsize=14.5, fontweight='bold', color='#0369A1', va='top')
t1_2 = "• TourAPI (5만 POI)\n• ORS (자차/도보 최적경로)\n• Gemini 3.5 Flash (AI)"
ax.text(x1 + 2.5, 60.8, t1_2, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

draw_box(x1 + 1.0, 33.6, box_w - 2.0, 15.6, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 47.6, "GitHub Actions CI", fontsize=14.5, fontweight='bold', color='#0369A1', va='top')
t1_3 = "• main 푸시 자동 빌드\n• Docker 이미지 생성\n• Self-Hosted Runner"
ax.text(x1 + 2.5, 44.0, t1_3, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

# 2열: Docker 컨테이너
x2 = x1 + box_w + gap_x
draw_box(x2, 33.0, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 84.4, box_w - 2.0, 4.4, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 86.6, "2. Docker 격리 컨테이너", fontsize=15.5, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 67.4, box_w - 2.0, 15.6, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 81.4, "Nginx 1.25 (웹/프록시)", fontsize=14.5, fontweight='bold', color='#047857', va='top')
t2_1 = "• HTTPS 종단 & 리다이렉트\n• React SPA 정적 서빙\n• API 역방향 프록시"
ax.text(x2 + 2.5, 77.8, t2_1, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

draw_box(x2 + 1.0, 50.4, box_w - 2.0, 15.6, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 64.4, "NestJS (백엔드 코어)", fontsize=14.5, fontweight='bold', color='#047857', va='top')
t2_2 = "• 일정 오케스트레이션\n• ORS 경로 연산 & 캐싱\n• 서킷 브레이커 방어"
ax.text(x2 + 2.5, 60.8, t2_2, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

draw_box(x2 + 1.0, 33.6, box_w - 2.0, 15.6, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 47.6, "FastAPI (날씨 AI 엔진)", fontsize=14.5, fontweight='bold', color='#047857', va='top')
t2_3 = "• Keras LSTM + LightGBM\n• 기온·강수·풍속 예측\n• 비동기 Uvicorn 서빙"
ax.text(x2 + 2.5, 44.0, t2_3, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

# 3열: Host Native & EBS
x3 = x2 + box_w + gap_x
draw_box(x3, 33.0, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 84.4, box_w - 2.0, 4.4, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 86.6, "3. EC2 Host Native & EBS", fontsize=15.5, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 67.4, box_w - 2.0, 15.6, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 81.4, "PostgreSQL 16 (호스트 직접)", fontsize=14.5, fontweight='bold', color='#C2410C', va='top')
t3_1 = "• EC2 Native 직접 설치\n• I/O 병목 완전 제거\n• 외부 5432 포트 차단"
ax.text(x3 + 2.5, 77.8, t3_1, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

draw_box(x3 + 1.0, 50.4, box_w - 2.0, 15.6, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 64.4, "Amazon EBS GP3 SSD", fontsize=14.5, fontweight='bold', color='#C2410C', va='top')
t3_2 = "• 3,000 IOPS 볼륨\n• PostGIS 5만 POI 저장\n• 경로 캐시 영구 보존"
ax.text(x3 + 2.5, 60.8, t3_2, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

draw_box(x3 + 1.0, 33.6, box_w - 2.0, 15.6, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 47.6, "Self-Hosted Runner", fontsize=14.5, fontweight='bold', color='#C2410C', va='top')
t3_3 = "• 인바운드 포트 불필요\n• 무중단 컨테이너 배포\n• 배포 실패 시 즉각 롤백"
ax.text(x3 + 2.5, 44.0, t3_3, fontsize=13.0, color='#1E293B', linespacing=1.48, va='top')

# 상단 화살표
draw_arrow((x1 + box_w, 86.6), (x2, 86.6), color='#059669', width=2.8, 
           label="HTTPS 프록시", label_offset=(0, 2.6), fontsize=12.0)
draw_arrow((x2 + box_w, 86.6), (x3, 86.6), color='#EA580C', width=2.8, 
           label="내부 DB 질의", label_offset=(0, 2.6), fontsize=12.0)

# 하단 박스
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 24.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 24.0, db_w - 2.0, 3.8, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 25.9, "클라우드 프로덕션 신뢰성 & 보안 정책", 
        fontsize=14.5, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.5, col_w, 17.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 21.0, "1. 보안 & 네트워크 격리", fontsize=14.5, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = "• TLS 1.3 & HSTS 보안\n• Docker 격리 브릿지망\n• Certbot SSL 자동 갱신"
ax.text(c1_x + 3.0, 17.2, t_c1, fontsize=13.0, color='#1E293B', linespacing=1.50, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.5, col_w, 17.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 21.0, "2. 공간 연산 & 캐시 최적화", fontsize=14.5, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = "• GiST R-Tree 30ms 질의\n• SHA-256 경로 24h 캐시\n• NVMe SSD I/O 병목 해소"
ax.text(c2_x + 3.0, 17.2, t_c2, fontsize=13.0, color='#1E293B', linespacing=1.50, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.5, col_w, 17.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 21.0, "3. 무중단 운영 & 자동 복구", fontsize=14.5, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = "• 무중단 컨테이너 교체\n• 배포 실패 시 자동 롤백\n• PostgreSQL 새벽 백업"
ax.text(c3_x + 3.0, 17.2, t_c3, fontsize=13.0, color='#1E293B', linespacing=1.50, va='top')

draw_arrow((50.0, 28.5), (50.0, 33.0), color='#4F46E5', width=2.8, 
           label="인프라 신뢰성 가드레일", label_pos=0.5, label_offset=(15.0, 0), fontsize=11.5)

output_path = "architecture_diagram.png"
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
