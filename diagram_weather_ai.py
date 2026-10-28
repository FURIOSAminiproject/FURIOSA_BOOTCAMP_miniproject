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
ax.text(50, 96.2, "딥러닝 기상 예측 & 맞춤 코스 추천 파이프라인", 
        fontsize=25, fontweight='bold', color='#0F172A', ha='center', va='center')
ax.text(50, 92.8, "FastAPI 비동기 서빙  ·  LSTM + LightGBM 앙상블  ·  5대 기상 지표 산출", 
        fontsize=14.0, color='#475569', ha='center', va='center')

box_w = 28.0
box_h = 51.0
gap_x = 5.5
start_x = 2.5

# STEP 01
x1 = start_x
draw_box(x1, 37.5, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
draw_box(x1 + 1.0, 82.8, box_w - 2.0, 4.6, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
ax.text(x1 + box_w/2, 85.1, "STEP 01. 기상 요청 & 전처리", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x1 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 78.8, "FastAPI 비동기 라우터", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_a = "• POST 요청 비동기 수신\n• 목적지 좌표 & 일정 파싱\n• Pydantic v2 유효성 검증"
ax.text(x1 + 2.5, 74.8, t1_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x1 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#38BDF8', border_width=1.5, radius=0.8)
ax.text(x1 + 2.5, 57.0, "시계열 피처 정규화", fontsize=15.5, fontweight='bold', color='#0369A1', va='top')
t1_b = "• 과거 30일 관측 데이터 로드\n• RobustScaler 이상치 보정\n• 삼각함수 계절성 인코딩"
ax.text(x1 + 2.5, 53.0, t1_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 02
x2 = x1 + box_w + gap_x
draw_box(x2, 37.5, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
draw_box(x2 + 1.0, 82.8, box_w - 2.0, 4.6, '#059669', '#059669', border_width=1.0, radius=0.6)
ax.text(x2 + box_w/2, 85.1, "STEP 02. AI 앙상블 추론", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x2 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 78.8, "Keras LSTM 시계열 모델", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_a = "• 2단계 LSTM 시계열 연속성\n• 기온·강수 장기 추세 학습\n• 50ms 초고속 텐서 추론"
ax.text(x2 + 2.5, 74.8, t2_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x2 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#34D399', border_width=1.5, radius=0.8)
ax.text(x2 + 2.5, 57.0, "LightGBM + Dense 결합", fontsize=15.5, fontweight='bold', color='#047857', va='top')
t2_b = "• 트리 기반 급변 날씨 감지\n• Dense 앙상블 가중 결합\n• 예측 오차(RMSE) 24% 개선"
ax.text(x2 + 2.5, 53.0, t2_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# STEP 03
x3 = x2 + box_w + gap_x
draw_box(x3, 37.5, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
draw_box(x3 + 1.0, 82.8, box_w - 2.0, 4.6, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
ax.text(x3 + box_w/2, 85.1, "STEP 03. 5대 지표 & 코스 조율", fontsize=16.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

draw_box(x3 + 1.0, 60.8, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 78.8, "정밀 5대 기상 지표", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_a = "• 일평균·최고·최저 기온(℃)\n• 일일 강수량(RN_DAY mm)\n• 평균 풍속(WS_AVG m/s)"
ax.text(x3 + 2.5, 74.8, t3_a, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

draw_box(x3 + 1.0, 39.0, box_w - 2.0, 20.5, '#FFFFFF', '#FB923C', border_width=1.5, radius=0.8)
ax.text(x3 + 2.5, 57.0, "스마트 여행 코스 조율", fontsize=15.5, fontweight='bold', color='#C2410C', va='top')
t3_b = "• 강수 시: 실내 코스 자동 대체\n• 맑은 날: 야외 전망대 우선\n• 일교차: 겉옷 패킹리스트 안내"
ax.text(x3 + 2.5, 53.0, t3_b, fontsize=14.2, color='#1E293B', linespacing=1.58, va='top')

# 상단 화살표
draw_arrow((x1 + box_w, 85.1), (x2, 85.1), color='#059669', width=2.8, 
           label="전처리 피처", label_offset=(0, 2.8), fontsize=12.0)
draw_arrow((x2 + box_w, 85.1), (x3, 85.1), color='#EA580C', width=2.8, 
           label="예측 결과 전달", label_offset=(0, 2.8), fontsize=12.0)

# 하단 DB 박스
db_w = 95.0
db_x = start_x
draw_box(db_x, 4.5, db_w, 26.0, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
draw_box(db_x + 1.0, 25.8, db_w - 2.0, 4.0, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
ax.text(50, 27.8, "PostgreSQL 16 DBMS  ·  model_artifacts 가중치 저장소 (EC2 Native 직접 설치 + EBS SSD)", 
        fontsize=15.0, fontweight='bold', color='#FFFFFF', ha='center', va='center')

col_w = (db_w - 4.0) / 3

# 카드 1
c1_x = db_x + 1.0
draw_box(c1_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c1_x + col_w/2, 23.0, "1. 모델 가중치 파일 관리", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c1 = "• Keras .h5 / .keras 모델 저장\n• LightGBM .txt 트리 가중치\n• 버전별 무중단 핫 리로드"
ax.text(c1_x + 2.5, 19.6, t_c1, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 2
c2_x = c1_x + col_w + 1.0
draw_box(c2_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c2_x + col_w/2, 23.0, "2. 관측소 매핑 메타데이터", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c2 = "• 전국 95개 관측소 메타데이터\n• 위경도 좌표 기준 최단 매핑\n• 결측치 보간 표준 레퍼런스"
ax.text(c2_x + 2.5, 19.6, t_c2, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

# 카드 3
c3_x = c2_x + col_w + 1.0
draw_box(c3_x, 5.8, col_w, 19.0, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
ax.text(c3_x + col_w/2, 23.0, "3. 실시간 추론 결과 캐싱", fontsize=15.2, fontweight='bold', color='#3730A3', ha='center', va='top')
t_c3 = "• 목적지·일자별 1시간 캐싱\n• 중복 딥러닝 연산 80% 절감\n• 실시간 QPS 폭증 안전 방어"
ax.text(c3_x + 2.5, 19.6, t_c3, fontsize=14.0, color='#1E293B', linespacing=1.58, va='top')

draw_arrow((50.0, 30.5), (50.0, 37.5), color='#4F46E5', width=2.8, 
           label="가중치 로드 & 예측 캐시 저장", label_pos=0.5, label_offset=(15.0, 0), fontsize=12.0)

output_path = "diagram_weather_ai.png"
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
