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
ax.text(50, 96.2, "종단 암호화 & 인프라 다중 보안 방어 체계", 
        fontsize=25, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "Let's Encrypt SSL/TLS 1.3  ·  Nginx 리버스 프록시  ·  Docker 브릿지 격리  ·  PostgreSQL 네이티브 방화벽", 
        fontsize=14.0, color='#475569', ha='center', va='center')

box_w = 28.0
box_h = 51.0
gap_x = 5.5
start_x = 2.5

# STEP 01
x1 = start_x
draw_box(x1, 37.5, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 82.8, box_w - 2.0, 4.6, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 85.1, "STEP 01. 클라이언트 HTTPS 통신", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "TLS 1.3 종단 암호화", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_a = "• HTTPS 443 포트 전송 암호화\n• AES-256 패킷 위변조 차단\n• HSTS 1년 강제 보안 접속"
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "Port 80 자동 리다이렉트", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_b = "• HTTP 80 -> HTTPS 443 강제\n• 평문 통신 원천 배제\n• 브라우저 신뢰 자물쇠 획득"
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. Nginx SSL 종단 & 프록시", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "인증서 로드 & 역방향 프록시", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = "• Let's Encrypt 인증서 로드\n• / -> React SPA 정적 서빙\n• /api -> NestJS / FastAPI"
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "Certbot 자동 갱신 데몬", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = "• 90일 만료 전 자동 갱신 Cron\n• Nginx reload 무중단 반영\n• 인증서 만료 위험 영구 해소"
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. Docker 격리 네트워크", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "travel-network 브릿지 격리", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_a = "• Docker Bridge 전용망 격리\n• 외부 80, 443 포트만 노출\n• 컨테이너 간 침해 전파 차단"
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "내부 통신 & API 게이트웨이", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_b = "• 내부 도메인 소켓 보안 통신\n• NestJS Rate-Limit DoS 방어\n• 민감 환경변수 .env 완벽 은닉"
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 화살표
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="HTTPS 암호화 통신", label_offset=(0, 2.8), fontsize=12.0)
draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#EA580C', width=2.8, 
           label="격리망 라우팅", label_offset=(0, 2.8), fontsize=12.0)

# 하단 DB 박스
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "PostgreSQL 16 Host Native 직접 설치  ·  DBMS 수준의 3중 보안 가드레일", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. 외부 포트 차단 (방화벽)", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = "• 5432 외부 인바운드 차단\n• AWS Security Group 엄격 격리\n• 내부 컨테이너만 접근 허용"
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. EBS 디스크 KMS 암호화", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = "• AWS KMS AES-256 암호화\n• 스토리지 탈취 시 복호화 불가\n• WAL 로그 및 스냅샷 암호화"
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. 계정 권한 최소화 & 백업", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = "• pg_hba.conf SCRAM-SHA-256\n• 최소 권한 원칙(Least Privilege)\n• 매일 새벽 자동 스냅샷 백업"
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="보안 소켓 연결 & 계정 인가", label_pos=0.5, label_offset=(15.0, 0), fontsize=12.0)

output_path = "diagram_auth_security.png"
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
