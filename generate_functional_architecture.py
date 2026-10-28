# -*- coding: utf-8 -*-
import os, time, shutil, tempfile
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

fig = plt.figure(figsize=(26, 14), dpi=250, facecolor='#FFFFFF')
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

def draw_arrow(start, end, color='#0284C7', width=2.6, label="", label_pos=0.5, label_offset=(0, 2.2), fontsize=11.0):
    arrow = patches.FancyArrowPatch(
        start, end,
        arrowstyle="-|>",
        color=color,
        linewidth=width,
        mutation_scale=16,
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
            bbox=dict(boxstyle="round,pad=0.25", facecolor="#FFFFFF", edgecolor=color, alpha=0.98, lw=1.3)
        )

# 메인 타이틀
ax.text(50, 96.6, "I am your J  ·  서비스 기능별 엔드투엔드 비즈니스 파이프라인", 
        fontsize=25, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 93.3, "5단계 비즈니스 여정 (조건 수집 -> AI 분석 -> 기상 예측 -> 경로 탐색 -> 지도 시각화)", 
        fontsize=14.5, color='#475569', ha='center', va='center')

card_w = 17.6
card_h = 54.5
gap_x = 2.0
start_x = 2.0

steps = [
    {
        "step": "STEP 01",
        "title": "여행 조건 수집",
        "bg": "#F0F9FF", "border": "#0284C7", "sub_border": "#38BDF8", "header_bg": "#0284C7", "title_c": "#0369A1",
        "sub1_title": "대화형 조건 수집",
        "sub1_text": "• 출발/도착지 입력\n• 당일/1박2일 설정\n• 자차/도보 선택",
        "sub2_title": "원클릭 스마트 칩",
        "sub2_text": "• 취향 키워드 칩\n• 미입력 자동 재안내\n• 대화 세션 유지"
    },
    {
        "step": "STEP 02",
        "title": "AI 자연어 분석",
        "bg": "#F0FDF4", "border": "#059669", "sub_border": "#34D399", "header_bg": "#059669", "title_c": "#047857",
        "sub1_title": "Gemini 3.5 Flash",
        "sub1_text": "• 취향 키워드 분석\n• 4구간 JSON 생성\n• 실존 명소 추천",
        "sub2_title": "TourAPI 분류 매핑",
        "sub2_text": "• 관광(12)·문화(14)\n• 음식점(39) 매핑\n• PostGIS 질의 변환"
    },
    {
        "step": "STEP 03",
        "title": "딥러닝 기상 예측",
        "bg": "#FEFCE8", "border": "#CA8A04", "sub_border": "#FACC15", "header_bg": "#CA8A04", "title_c": "#A16207",
        "sub1_title": "AI 앙상블 모델",
        "sub1_text": "• LSTM 시계열 연속성\n• LightGBM 급변 감지\n• 50ms 초고속 추론",
        "sub2_title": "맞춤 코스 조율",
        "sub2_text": "• 기온·강수·풍속 산출\n• 우천 시 실내 대체\n• 복장 패킹리스트 안내"
    },
    {
        "step": "STEP 04",
        "title": "경로 & 길목 명소",
        "bg": "#FFF7ED", "border": "#EA580C", "sub_border": "#FB923C", "header_bg": "#EA580C", "title_c": "#C2410C",
        "sub1_title": "ORS 최적 경로",
        "sub1_text": "• 자차/도보 전용 도로망\n• LineString 실시간 생성\n• SHA-256 24h 캐시",
        "sub2_title": "PostGIS 5km 질의",
        "sub2_text": "• 경로 5km 버퍼 탐색\n• GiST 인덱스 30ms 질의\n• 도로변 알짜 명소 추천"
    },
    {
        "step": "STEP 05",
        "title": "지도 시각화",
        "bg": "#EEF2FF", "border": "#4F46E5", "sub_border": "#818CF8", "header_bg": "#4F46E5", "title_c": "#3730A3",
        "sub1_title": "TourAPI 4.0 결합",
        "sub1_text": "• 대표 이미지 동기화\n• 운영시간·주차 결합\n• 랜드마크 자동 Fallback",
        "sub2_title": "Leaflet 인터랙티브",
        "sub2_text": "• Polyline 경로 표시\n• 경유지 드래그 재연산\n• 거리·시간 실시간 안내"
    }
]

for i, s in enumerate(steps):
    cx = start_x + i * (card_w + gap_x)
    draw_box(cx, 34.5, card_w, card_h, s["bg"], s["border"], border_width=2.5, radius=1.2)
    
    # 헤더 태그
    draw_box(cx + 0.8, 84.0, card_w - 1.6, 4.4, s["header_bg"], s["header_bg"], border_width=1.0, radius=0.6)
    ax.text(cx + card_w/2, 86.2, f"{s['step']}. {s['title']}", fontsize=14.2, fontweight='bold', color='#FFFFFF', ha='center', va='center')
    
    # 서브박스 1 (h=22.2)
    draw_box(cx + 0.8, 60.5, card_w - 1.6, 22.2, '#FFFFFF', s["sub_border"], border_width=1.5, radius=0.8)
    ax.text(cx + 1.8, 79.5, s["sub1_title"], fontsize=16.0, fontweight='bold', color=s["title_c"], va='top')
    ax.text(cx + 1.8, 74.8, s["sub1_text"], fontsize=14.8, color='#1E293B', linespacing=1.85, va='top')
    
    # 서브박스 2 (h=22.8)
    draw_box(cx + 0.8, 36.3, card_w - 1.6, 22.8, '#FFFFFF', s["sub_border"], border_width=1.5, radius=0.8)
    ax.text(cx + 1.8, 55.8, s["sub2_title"], fontsize=16.0, fontweight='bold', color=s["title_c"], va='top')
    ax.text(cx + 1.8, 51.2, s["sub2_text"], fontsize=14.8, color='#1E293B', linespacing=1.85, va='top')

# 상단 화살표
for i in range(4):
    x_from = start_x + i * (card_w + gap_x) + card_w
    x_to = start_x + (i + 1) * (card_w + gap_x)
    draw_arrow((x_from, 86.2), (x_to, 86.2), color='#475569', width=2.4)

# 하단 박스
db_w = 96.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 25.0, '#F8FAFC', '#334155', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.0, db_w - 2.0, 3.8, '#334155', '#334155', border_width=1.0, radius=0.6)
ax.text(50, 26.9, "AWS EC2 프로덕션 인프라 & 엔터프라이즈 신뢰성 계층 (Enterprise Platform Stack)", 
        fontsize=15.5, fontweight='bold', color='#FFFFFF', ha='center', va='center')

bot_w = (db_w - 4.0) / 3

# 하단 1: PostgreSQL 16
b1_x = db_x + 1.0
draw_box(b1_x, 5.5, bot_w, 18.2, '#FFFFFF', '#475569', border_width=1.5, radius=0.8)
ax.text(b1_x + bot_w/2, 21.2, "PostgreSQL 16 + PostGIS (호스트 직접)", fontsize=15.5, fontweight='bold', color='#0F172A', ha='center', va='top')
t_b1 = "• EC2 Native 직접 설치 (I/O 극대화)\n• EBS GP3 SSD: 3,000 IOPS 볼륨\n• 5만 POI GiST 인덱스 & 24h 캐시"
ax.text(b1_x + 2.5, 17.2, t_b1, fontsize=14.5, color='#1E293B', linespacing=1.75, va='top')

# 하단 2: Docker 컨테이너
b2_x = b1_x + bot_w + 1.0
draw_box(b2_x, 5.5, bot_w, 18.2, '#FFFFFF', '#475569', border_width=1.5, radius=0.8)
ax.text(b2_x + bot_w/2, 21.2, "Docker 격리 컨테이너 3종 (travel-network)", fontsize=15.5, fontweight='bold', color='#0F172A', ha='center', va='top')
t_b2 = "• Nginx 1.25: SSL 종단 & React SPA\n• NestJS: 코디네이터 & 서킷 브레이커\n• FastAPI: Keras + LightGBM 서빙"
ax.text(b2_x + 2.5, 17.2, t_b2, fontsize=14.5, color='#1E293B', linespacing=1.75, va='top')

# 하단 3: CI/CD
b3_x = b2_x + bot_w + 1.0
draw_box(b3_x, 5.5, bot_w, 18.2, '#FFFFFF', '#475569', border_width=1.5, radius=0.8)
ax.text(b3_x + bot_w/2, 21.2, "GitHub Actions CI & Self-Hosted Runner", fontsize=15.5, fontweight='bold', color='#0F172A', ha='center', va='top')
t_b3 = "• main 푸시 시 자동 빌드 & 테스트\n• EC2 Self-Hosted Runner 무중단 배포\n• 실패 시 자동 롤백 (Zero-Downtime)"
ax.text(b3_x + 2.5, 17.2, t_b3, fontsize=14.5, color='#1E293B', linespacing=1.75, va='top')

draw_arrow((30.0, 29.5), (30.0, 34.5), color='#334155', width=2.6, 
           label="공간 DB & 모델 질의", label_pos=0.5, label_offset=(0, 0), fontsize=12.0)
draw_arrow((70.0, 29.5), (70.0, 34.5), color='#334155', width=2.6, 
           label="무중단 프록시 연동", label_pos=0.5, label_offset=(0, 0), fontsize=12.0)

output_path = "functional_architecture.png"
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
