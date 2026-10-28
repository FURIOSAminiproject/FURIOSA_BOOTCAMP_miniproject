#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
========================================================================================
I AM YOUR J - 핵심 코드 분석 및 PPT 발표 자료 자동 생성 엔진 (generate_ppt_code_analysis.py)
========================================================================================
핵심 4대 엔진(날씨 ML/DL 예측, 채팅 LLM 동작, 장소 추천 알고리즘, 경로 탐색/캐시) 및
4대 시스템 엔지니어링(CI/CD, React 워크스페이스, PostGIS DB, Docker/백업) 심층 분석
16:9 와이드스크린 4K 프레젠테이션 고해상도 슬라이드 자동 렌더링
- 글씨 굵게(BOLD) 적용 및 박스 밖 넘침 원천 차단(간결하고 압축된 기술 문장)
========================================================================================
"""

import os
import sys
import time
import shutil
import tempfile
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

OUTPUT_DIR = "ppt_slides"

# -----------------------------------------------------------------------------
# 공통 그래픽 유틸리티 함수 (큰 글씨 & 여백 최적화)
# -----------------------------------------------------------------------------
def draw_rounded_box(ax, x, y, w, h, bg_color, border_color, border_width=1.8, radius=0.8, zorder=2):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.0,rounding_size={radius}",
        facecolor=bg_color,
        edgecolor=border_color,
        linewidth=border_width,
        zorder=zorder
    )
    ax.add_patch(box)
    return box

def render_slide_header(ax, slide_no, total_slides, category, title, subtitle, badge_bg="#064E43", badge_fg="#A7F3D0"):
    # 최상단 카테고리 뱃지
    badge_w = len(category) * 1.05 + 3.0
    draw_rounded_box(ax, 3.0, 93.6, badge_w, 3.0, badge_bg, badge_bg, radius=0.6, zorder=3)
    ax.text(3.0 + badge_w / 2.0, 95.1, category, color=badge_fg, fontsize=12.2, fontweight='bold', ha='center', va='center', zorder=4)
    
    # 브랜드 뱃지 (우측 상단)
    ax.text(97.0, 95.1, "I AM YOUR J  ·  System Architecture Code Review", color='#64748B', fontsize=12.5, fontweight='bold', ha='right', va='center')
    
    # 메인 슬라이드 타이틀 (23.5pt 볼드 적용)
    ax.text(3.0, 89.8, title, color='#0F172A', fontsize=23.5, fontweight='bold', ha='left', va='center')
    # 서브타이틀
    ax.text(3.0, 86.4, subtitle, color='#475569', fontsize=13.0, ha='left', va='center')
    
    # 구분선
    ax.plot([3.0, 97.0], [84.2, 84.2], color='#CBD5E1', lw=1.5, zorder=2)

def render_slide_footer(ax, slide_no, total_slides, takeaway_text):
    # 하단 요약 바
    draw_rounded_box(ax, 3.0, 2.5, 94.0, 5.5, "#0F172A", "#1E293B", border_width=1.2, radius=0.8, zorder=3)
    
    # 핵심 테이크어웨이 문구
    ax.text(4.8, 5.25, "[★ KEY TAKEAWAY]", color='#FCD34D', fontsize=12.5, fontweight='bold', va='center', zorder=4)
    ax.text(21.5, 5.25, takeaway_text, color='#FFFFFF', fontsize=12.8, fontweight='bold', va='center', zorder=4)
    
    # 페이지 번호
    ax.text(95.2, 5.25, f"Slide {slide_no} / {total_slides}", color='#94A3B8', fontsize=12.5, fontweight='bold', ha='right', va='center', zorder=4)

def render_code_window(ax, x, y, w, h, filename, code_lines, lang="code"):
    """
    좌측 다크 IDE 스타일 코드 창
    - 코드 길이와 라인 수에 따라 동적 line_step 및 최적 폰트 크기 자동 계산
    - 코드 박스 오른쪽 테두리 밖 넘침 원천 차단
    """
    draw_rounded_box(ax, x, y, w, h, "#0F172A", "#334155", border_width=2.0, radius=1.0, zorder=3)
    
    # 상단 윈도우 타이틀바
    header_h = 4.0
    draw_rounded_box(ax, x, y + h - header_h, w, header_h, "#1E293B", "#334155", border_width=1.0, radius=0.8, zorder=4)
    
    # macOS 스타일 3색 윈도우 버튼
    circle_y = y + h - header_h / 2.0
    for idx, c in enumerate(["#EF4444", "#F59E0B", "#10B981"]):
        circ = patches.Circle((x + 1.8 + idx * 1.5, circle_y), 0.55, facecolor=c, edgecolor='none', zorder=5)
        ax.add_patch(circ)
        
    # 파일명 뱃지
    ax.text(x + w / 2.0, circle_y, f"FILE: {filename}", color='#F8FAFC', fontsize=11.8, fontfamily='Malgun Gothic', fontweight='bold', ha='center', va='center', zorder=5)
    ax.text(x + w - 2.0, circle_y, lang.upper(), color='#94A3B8', fontsize=10.5, fontfamily='Consolas', ha='right', va='center', zorder=5)
    
    # 본문 코드 텍스트 렌더링 (동적 줄간격 및 가변 폰트)
    n_lines = len(code_lines)
    avail_h = h - header_h - 3.2
    line_step = min(2.80, avail_h / max(n_lines, 1))
    code_font_size = 10.6 if n_lines > 23 else (11.0 if n_lines > 20 else 11.4)
    
    code_start_y = y + h - header_h - 2.2
    for i, line in enumerate(code_lines):
        line_y = code_start_y - i * line_step
        if line_y < y + 1.0:
            break
        # 줄 번호
        ax.text(x + 1.6, line_y, f"{i+1:2d}", color='#475569', fontsize=code_font_size - 0.5, fontfamily='Consolas', va='center', zorder=5)
        # 세로 구분선
        ax.plot([x + 3.6, x + 3.6], [line_y - line_step * 0.45, line_y + line_step * 0.45], color='#334155', lw=0.8, zorder=4)
        
        # 텍스트 컬러링
        stripped = line.strip()
        color = '#F8FAFC'
        if stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('--'):
            color = '#94A3B8'
        elif any(k in line for k in ['name:', 'runs-on:', 'steps:', 'uses:', 'with:', 'run:', 'concurrency:', 'services:', 'networks:', 'volumes:', 'ports:']):
            color = '#38BDF8'
        elif any(k in line for k in ['function', 'class', 'export', 'import', 'const', 'return', 'async', 'await', 'def ', 'CREATE TABLE', 'CONSTRAINT', 'PRIMARY KEY']):
            color = '#F43F5E'
        elif any(k in line for k in ['LOOKBACK', 'Bidirectional', 'LSTM', 'Dense', 'Dropout', 'Input', 'Model', 'LGBMRegressor', 'surveyStep', 'canonicalJson', 'requestHash']):
            color = '#FBBF24'
        elif any(k in line for k in ['true', 'false', 'null', 'NOT NULL', 'DEFAULT', 'CHECK']):
            color = '#A78BFA'
        elif '"' in line or "'" in line:
            color = '#34D399'
            
        # 한글 폰트 분기
        has_korean = any((0xAC00 <= ord(char) <= 0xD7A3) or (0x1100 <= ord(char) <= 0x11FF) or (0x3130 <= ord(char) <= 0x318F) for char in line)
        font_to_use = 'Malgun Gothic' if has_korean else 'Consolas'
        ax.text(x + 4.4, line_y, line, color=color, fontsize=code_font_size, fontfamily=font_to_use, va='center', zorder=5)

def render_analysis_cards(ax, x, y, w, h, cards):
    """
    우측 4개 분석 카드 렌더링:
    - 타이틀: 15.0pt BOLD
    - 본문 텍스트: 12.8pt BOLD (굵은 글씨로 가독성 극대화)
    - 간결한 2개 핵심 불릿으로 박스 밖 넘침 100% 차단
    """
    n_cards = len(cards)
    gap = 1.6
    card_h = (h - (n_cards - 1) * gap) / n_cards
    
    for i, c in enumerate(cards):
        cy = y + h - (i + 1) * card_h - i * gap
        
        # 배경 카드 박스
        draw_rounded_box(ax, x, cy, w, card_h, c.get("bg", "#F8FAFC"), c.get("border", "#CBD5E1"), border_width=1.8, radius=0.8, zorder=3)
        
        # 좌측 강조 컬러 바
        draw_rounded_box(ax, x, cy, 1.3, card_h, c.get("accent", "#0284C7"), c.get("accent", "#0284C7"), radius=0.4, zorder=4)
        
        # 카드 타이틀 (대형 볼드 15.0pt)
        ax.text(x + 2.8, cy + card_h - 2.8, c["title"], color='#0F172A', fontsize=15.0, fontweight='bold', va='center', zorder=4)
        
        # 본문 불릿 항목들 (굵은 글씨 12.8pt BOLD)
        item_y = cy + card_h - 6.2
        item_step = 3.6
        for item in c["items"]:
            # 불릿 점
            ax.plot([x + 3.2], [item_y], marker='o', markersize=4.5, color=c.get("accent", "#0284C7"), zorder=4)
            # 굵고 선명한 텍스트 (박스 내 여유 있게 배치)
            ax.text(x + 4.6, item_y, item, color='#0F172A', fontsize=12.8, fontweight='bold', va='center', zorder=4)
            item_y -= item_step

def save_and_copy_slide(fig, filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    temp_path = os.path.join(tempfile.gettempdir(), f"temp_{filename}")
    fig.savefig(temp_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor(), pad_inches=0.1)
    plt.close(fig)
    
    target_path = os.path.join(OUTPUT_DIR, filename)
    copied = False
    for _ in range(10):
        try:
            shutil.copy2(temp_path, target_path)
            copied = True
            break
        except Exception:
            time.sleep(0.3)
    if not copied:
        with open(temp_path, 'rb') as fsrc, open(target_path, 'wb') as fdst:
            fdst.write(fsrc.read())
            
    print(f"  [생성 완료] {target_path} (크기: {os.path.getsize(target_path)/1024:.1f} KB)")


# =============================================================================
# SLIDE 01: .github/workflows (CI/CD 자동 배포 파이프라인)
# =============================================================================
def generate_slide_01():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 1, 8,
        category="[CI/CD & DEVOPS PIPELINE]",
        title="01. CI/CD 무중단 자동 배포 파이프라인 (.github/workflows)",
        subtitle="Two-Stage 빌드-배포 분리  ·  Self-Hosted EC2 러너  ·  동시성 제어  ·  무중단 Nginx 갱신",
        badge_bg="#0284C7", badge_fg="#E0F2FE"
    )
    
    code = [
        "name: Deploy React to EC2",
        "on:",
        "  push:",
        "    branches: [ main ]",
        "    paths: [ 'FrontEnd/**', 'CI_CD/FrontEnd/**' ]",
        "",
        "# 동시성 제어: 동일 배포 그룹 내 중복 빌드 경합 차단",
        "concurrency:",
        "  group: frontend-production",
        "  cancel-in-progress: true",
        "",
        "jobs:",
        "  build:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - uses: actions/setup-node@v4",
        "        with:",
        "          node-version: '22'",
        "          cache: 'npm'",
        "      - run: bash CI_CD/FrontEnd/build.sh",
        "      - uses: actions/upload-artifact@v4",
        "        with:",
        "          name: frontend-dist",
        "          path: FrontEnd/v1/dist/",
        "",
        "  deploy:",
        "    needs: build",
        "    runs-on: [self-hosted, linux]",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "        with: { clean: false }  # .env 보존",
        "      - uses: actions/download-artifact@v4",
        "      - run: bash CI_CD/FrontEnd/deploy.sh"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "deploy.yml (GitHub Actions)", code, lang="yaml")
    
    cards = [
        {
            "title": "1. Two-Stage 빌드·배포 분리 (Build Isolation)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "클라우드 러너에서 React 번들 빌드 -> EC2 인스턴스 CPU 부하 0%",
                "upload-artifact로 dist/ 산출물 생성 후 배포 잡으로 안전 인계"
            ]
        },
        {
            "title": "2. Self-Hosted 러너 & 설정 보존 (clean: false)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "EC2 내부 러너가 배포 수행 -> 외부 SSH 포트 개방 없는 보안 배포",
                "clean: false 옵션으로 서버 내 사전 배치된 .env 환경 설정 보존"
            ]
        },
        {
            "title": "3. 동시성 제어 (concurrency & cancel-in-progress)",
            "accent": "#E11D48", "border": "#FECDD3", "bg": "#FFF1F2",
            "items": [
                "group: frontend-production 지정으로 중복 빌드 실행 경합 차단",
                "신규 푸시 발생 시 이전 빌드 즉시 취소하고 최신 커밋만 반영"
            ]
        },
        {
            "title": "4. 무중단 Nginx 동기화 (Zero-Downtime Reload)",
            "accent": "#4F46E5", "border": "#C7D2FE", "bg": "#EEF2FF",
            "items": [
                "deploy.sh 원자적(Atomic) 디렉토리 교체로 웹 루트 동기화",
                "Nginx reload 신호 전달 -> 사용자 서비스 중단 시간 0초 달성"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 1, 8,
        "빌드-배포 분리와 Self-hosted 러너를 통해 운영 서버 리소스를 보호하며 원자적 무중단 배포를 실현합니다."
    )
    save_and_copy_slide(fig, "slide_01_github_workflows.png")


# =============================================================================
# SLIDE 02: 날씨 모델 훈련 및 예측 (BackEnd/FastAPI/weather_prediction)
# =============================================================================
def generate_slide_02():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 2, 8,
        category="[AI & MACHINE LEARNING ENGINE]",
        title="02. 날씨 예측 머신러닝/딥러닝 모델 훈련 및 추론 (BackEnd/FastAPI)",
        subtitle="LOOKBACK=14 시계열  ·  BiLSTM Model A/B  ·  LightGBM 피처  ·  Dense Stacking 앙상블",
        badge_bg="#059669", badge_fg="#D1FAE5"
    )
    
    code = [
        "# 1. 14일 시계열 BiLSTM 신경망 (Model A: X 외생변수 예측)",
        "def build_x_model(lookback=14, n_features=12):",
        "    inputs = Input(shape=(lookback, n_features))",
        "    x = Bidirectional(LSTM(64, return_sequences=True))(",
        "        inputs",
        "    )",
        "    x = Dropout(0.2)(x)",
        "    x = Bidirectional(LSTM(32))(x)",
        "    x = Dense(64, activation='relu')(x)",
        "    outputs = Dense(n_features, activation='linear')(x)",
        "    return Model(inputs=inputs, outputs=outputs)",
        "",
        "# 2. LightGBM GBDT 모델 파라미터 (일교차/이동평균 피처 학습)",
        "def make_lgbm_model(n_estimators=500):",
        "    return LGBMRegressor(",
        "        n_estimators=n_estimators,",
        "        learning_rate=0.03, num_leaves=31,",
        "        subsample=0.8, colsample_bytree=0.8",
        "    )",
        "",
        "# 3. BiLSTM + LightGBM 결합 Stacking 앙상블 모델",
        "def build_dense_ensemble_model(n_inputs=2):",
        "    inputs = Input(shape=(n_inputs,), name='base_preds')",
        "    x = Dense(16, activation='relu')(inputs)",
        "    x = Dense(8, activation='relu')(x)",
        "    outputs = Dense(1, activation='linear')(x)",
        "    model = Model(inputs=inputs, outputs=outputs)",
        "    model.compile(optimizer='adam', loss='mse')",
        "    return model"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "weather_model.py (TensorFlow & LightGBM)", code, lang="python")
    
    cards = [
        {
            "title": "1. 14일 시계열 시퀀스 & 계절 주기성 (LOOKBACK=14)",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "최근 14일치 기온·습도·풍속·일사량 기상 데이터 시퀀스화",
                "SIN/COS 삼각함수 연산으로 연간 계절 주기성 특성 벡터 추출"
            ]
        },
        {
            "title": "2. 다변량 외생변수 선행 예측 (Model A: X_BiLSTM)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "2층 Bidirectional LSTM(64/32)으로 시간 전후 종속성 양방향 학습",
                "recursive_forecast_x 재귀 주입으로 미래 기상 다일 예측 수행"
            ]
        },
        {
            "title": "3. LightGBM GBDT 피처 엔지니어링 (create_features)",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "일교차(TA_RANGE), 1일/365일 LAG, 7일 이동평균 자동 생성",
                "결정트리 분할로 폭염·한파·강수 등 비선형 임계 조건 정밀 학습"
            ]
        },
        {
            "title": "4. Dense Stacking 앙상블 및 실시간 추론 (Ensemble)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "BiLSTM과 LightGBM 예측값을 2층 Dense 앙상블망으로 결합",
                "EarlyStopping(patience=7) 적용 및 FastAPI 실시간 추론 서빙"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 2, 8,
        "양방향 시계열 BiLSTM과 트리 기반 LightGBM을 Stacking 앙상블하여 일교차와 비선형 기상 급변을 정밀 예측합니다."
    )
    save_and_copy_slide(fig, "slide_02_backend_nestjs.png")


# =============================================================================
# SLIDE 03: 대화형 AI 여행 플래너 및 자연어 설문 파싱 (BackEnd/NestJS)
# =============================================================================
def generate_slide_03():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 3, 8,
        category="[AI DIALOGUE & NATURAL LANGUAGE AGENT]",
        title="03. 대화형 AI 여행 플래너 및 자연어 설문 파싱 (BackEnd/NestJS)",
        subtitle="4단계 순차 상태 머신(surveyStep)  ·  자연어 일정 정규화  ·  Gemini 2.5 Flash  ·  구조화 JSON",
        badge_bg="#0D9488", badge_fg="#CCFBF1"
    )
    
    code = [
        "// 1. 실제 검증된 데이터 필드로 단계를 판정하는 상태 머신",
        "export function surveyStep(draft: SurveyDraft): number {",
        "  // 1단계: 출발지/도착지 검증",
        "  if (!draft.originName?.trim() || !draft.destinationName?.trim())",
        "    return 1;",
        "  ",
        "  // 2단계: 일정 및 출발시간 검증 (1~10일)",
        "  const hasDates = validDate(draft.startDate) && validDate(draft.endDate);",
        "  const days = hasDates",
        "    ? (Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000 + 1",
        "    : 0;",
        "  const validDays = draft.durationLabel?.trim() && days >= 1 && days <= 10;",
        "  if (!validDays || !draft.departureTime) return 2;",
        "  ",
        "  // 3단계: 이동수단 명시 선택 검증 (차량/도보)",
        "  const validModes = ['driving', 'walking'];",
        "  if (!draft.modeConfirmed || !validModes.includes(draft.mode || ''))",
        "    return 3;",
        "  ",
        "  // 4단계: 여행 취향 복수 선택 및 '선택 완료' 확정 검증",
        "  if (!draft.preferences?.trim() || draft.preferencesConfirmed !== true)",
        "    return 4;",
        "  return 5; // 5단계: 모든 조건 완료 -> 플래너 생성",
        "}",
        "",
        "// 2. 취향 복수 누적(Set) 병합 및 '선택 완료' 즉시 확정",
        "if (completingPreferences) {",
        "  extracted.preferencesConfirmed = !!draft.preferences?.trim();",
        "} else if (currentStep === 4 && message) {",
        "  extracted.preferences = previous ? `${previous}, ${message}` : message;",
        "  extracted.selectedCategoryIds = [",
        "    ...new Set([...(draft.categoryIds || []), ...incoming.categoryIds])",
        "  ];",
        "}"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "planner-survey.ts & chat.service.ts", code, lang="typescript")
    
    cards = [
        {
            "title": "1. 엄격한 4단계 상태 전이 머신 (surveyStep State)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "AI 완료 주장 배제, 검증된 필드 존재 여부로 1~5단계 엄격 판정",
                "출발·도착 -> 일정·시간 -> 교통수단 -> 취향테마 순차 전이"
            ]
        },
        {
            "title": "2. 구어체 일정·시간 정규화 (scheduleFromText)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "'내일 아침 9시', '2박 3일' -> YYYY-MM-DD 및 HH:mm 변환",
                "1~10일 기간 검증 및 UTC 자정 계산으로 시차 왜곡 원천 차단"
            ]
        },
        {
            "title": "3. 이동수단 명시 선택 강제 (explicitTravelMode)",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "차량('driving') 또는 도보('walking') 명시 선택만 프로필 확정",
                "대중교통·모호한 답변은 3단계 잔류시켜 지원 수단 재확인"
            ]
        },
        {
            "title": "4. 취향 다중 누적 및 확정 바이패스 (Multi-Preferences)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "취향 복수 선택 시 Set 합집합으로 카테고리 ID 누적 병합",
                "'선택 완료' 클릭 시 LLM 호출 우회해 지연 0ms로 즉시 확정"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 3, 8,
        "취향 다중 선택 누적과 명시적 '선택 완료' 상태 머신으로 사용자 의도를 정밀하게 반영합니다."
    )
    save_and_copy_slide(fig, "slide_03_backups_manifest.png")


# =============================================================================
# SLIDE 04: 여행 장소 추천 및 공간 격자 인덱싱 (BackEnd & DataBase)
# =============================================================================
def generate_slide_04():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 4, 8,
        category="[SPATIAL RECOMMENDATION ENGINE]",
        title="04. 경로 기반 여행 장소 추천 및 공간 격자 인덱싱 (BackEnd & DataBase)",
        subtitle="Equirectangular 지역 평면 투영  ·  공간 격자(Grid Cells)  ·  선분 수직거리 계산  ·  거점 큐레이션",
        badge_bg="#4338CA", badge_fg="#E0E7FF"
    )
    
    code = [
        "// 1. 전체 경로 선분을 지역 평면에 투영 및 공간 격자 인덱싱",
        "export class RouteProximity {",
        "  private readonly yScale = EARTH_RADIUS * (Math.PI / 180);",
        "  private readonly xScale: number;",
        "  private readonly cells = new Map<string, Set<number>>();",
        "",
        "  constructor(coords: Coordinate[], private radius: number) {",
        "    const midLat = (minLat + maxLat) / 2;",
        "    this.xScale = this.yScale * Math.cos(midLat * (Math.PI / 180));",
        "    ",
        "    // 도로 선분을 지역 평면(XY)으로 투영하여 격자 등록",
        "    for (let i = 1; i < coords.length; i++) {",
        "      const p1 = this.project(coords[i - 1]);",
        "      const p2 = this.project(coords[i]);",
        "      this.registerSegment(p1, p2);",
        "    }",
        "  }",
        "",
        "  // 2. 관광지 좌표와 도로 선분 간 최단 수직거리 계산 (5km 이내)",
        "  distanceToPoint(point: Coordinate): number {",
        "    const p = this.project(point);",
        "    return this.findMinDistanceToSegments(p); // 선분 수직거리",
        "  }",
        "}"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "route-proximity.ts & explorer.service.ts", code, lang="typescript")
    
    cards = [
        {
            "title": "1. 구면 좌표 지역 평면 투영 (Equirectangular)",
            "accent": "#4338CA", "border": "#C7D2FE", "bg": "#EEF2FF",
            "items": [
                "중심 위도 기준 X/Y 평면 미터 투영으로 연산 비용 대폭 절감",
                "xScale=yScale*cos(lat) 보정으로 거리 왜곡 오차 1% 미만 유지"
            ]
        },
        {
            "title": "2. 공간 격자 인덱싱 및 O(1) 필터링 (Spatial Grid)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "도로 선분이 지나는 격자 셀(Map<string, Set>) 사전 인덱싱",
                "전수 조사 배제, 탐색 반경(5km) 인접 격자 선분만 수직 검사"
            ]
        },
        {
            "title": "3. 도로 선분 중간 지점 감지 (Perpendicular Distance)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "꼭짓점 거리 오류 방지, 도로 선분과 최단 수직거리 계산",
                "고속도로 등 도로 본선 5km 이내 휴게소·명소·맛집 정확 탐색"
            ]
        },
        {
            "title": "4. 도착지 거점 카테고리별 병렬 수집 (Spot Gathering)",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "관광·맛집·숙박 병렬 쿼리 & 숙박(32)은 관광 필터와 분리 탐색",
                "3km->5km, 10km->20km 자동 확장 및 도착시각 기반 큐레이션"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 4, 8,
        "공간 격자 인덱싱과 선분 수직거리 투영을 결합하여 장거리 도로변 5km 이내 핵심 명소를 실시간 발굴합니다."
    )
    save_and_copy_slide(fig, "slide_04_database_schema.png")


# =============================================================================
# SLIDE 05: 경로 추천 및 캐시 코디네이터 (BackEnd/NestJS)
# =============================================================================
def generate_slide_05():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 5, 8,
        category="[ROUTING ENGINE & HIGH-CONCURRENCY CACHE]",
        title="05. 다중 모달 경로 생성 및 캐시 코디네이터 (BackEnd/NestJS)",
        subtitle="OpenRouteService 다중 프로필  ·  Canonical JSON 정렬  ·  SHA-256 해시  ·  Single-Flight 제어",
        badge_bg="#0891B2", badge_fg="#CFFAFE"
    )
    
    code = [
        "// 1. 요청 파라미터 정렬 및 SHA-256 고유 해시 키 생성",
        "export function canonicalJson(value: unknown): string {",
        "  if (Array.isArray(value)) {",
        "    return '[' + value.map(canonicalJson).join(',') + ']';",
        "  }",
        "  if (value !== null && typeof value === 'object') {",
        "    const sorted = Object.entries(value)",
        "      .sort(([a], [b]) => (a < b ? -1 : 1));",
        "    return '{' + sorted.map(([k, v]) =>",
        "      JSON.stringify(k) + ':' + canonicalJson(v)",
        "    ).join(',') + '}';",
        "  }",
        "  return JSON.stringify(value);",
        "}",
        "",
        "export function requestHash(provider: string, req: unknown): string {",
        "  const payload = provider + ':' + canonicalJson(req);",
        "  return createHash('sha256')",
        "    .update(payload)",
        "    .digest('hex');",
        "}",
        "",
        "// 2. Single-Flight 패턴으로 캐시 스탬피드 원천 방지",
        "async get(request: Q): Promise<CacheResult<T>> {",
        "  const hash = requestHash(this.name, request);",
        "  const existing = this.pending.get(hash);",
        "  if (existing) return existing; // 진행 중 Promise 공유",
        "",
        "  // DB 캐시 확인 -> Cache Miss 시 ORS 호출",
        "  const task = this.load(hash, request);",
        "  this.pending.set(hash, task);",
        "  try { return await task; }",
        "  finally { this.pending.delete(hash); }",
        "}"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "cache-coordinator.ts & routing.service.ts", code, lang="typescript")
    
    cards = [
        {
            "title": "1. 다중 프로필 경로 탐색 (OpenRouteService Multi-Profile)",
            "accent": "#0891B2", "border": "#A5F3FC", "bg": "#ECFEFF",
            "items": [
                "차량(driving-car) 및 도보(foot-walking) 전용 도로망 분리 탐색",
                "추천(recommended) 및 최단(shortest) 대안 경로 동시 비교"
            ]
        },
        {
            "title": "2. 파라미터 정규화 직렬화 (canonicalJson Key Sort)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "JSON 객체 키를 알파벳순 재귀 정렬하여 동일 문자열 보장",
                "출발·도착 좌표 배열 순서는 보존하여 경로 의미 정확 유지"
            ]
        },
        {
            "title": "3. SHA-256 해시 키 및 계층형 캐싱 (SHA-256 Hash & TTL)",
            "accent": "#4F46E5", "border": "#C7D2FE", "bg": "#EEF2FF",
            "items": [
                "provider:canonicalJson을 SHA-256 해싱하여 64자리 키 생성",
                "PostgreSQL 캐시 테이블 저장 및 TTL 동안 외부 호출 생략"
            ]
        },
        {
            "title": "4. Single-Flight 캐시 스탬피드 방어 (Single-Flight)",
            "accent": "#E11D48", "border": "#FECDD3", "bg": "#FFF1F2",
            "items": [
                "pending Map으로 동일 해시의 동시 요청을 단일 프로미스 결합",
                "동일 요청 수십 개 유입 시 최초 작업 완료 결과를 공유 수신"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 5, 8,
        "Canonical JSON 정렬과 Single-Flight 패턴으로 캐시 스탬피드를 방어하고 외부 라우팅 쿼터를 보호합니다."
    )
    save_and_copy_slide(fig, "slide_05_diagrams_pipeline.png")


# =============================================================================
# SLIDE 06: React 18 프론트엔드 대화형 워크스페이스 (FrontEnd/v1)
# =============================================================================
def generate_slide_06():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 6, 8,
        category="[FRONTEND & CLIENT ARCHITECTURE]",
        title="06. React 18 대화형 워크스페이스 및 예외 방어 (FrontEnd/v1)",
        subtitle="20개 거점 지오코딩 폴백  ·  display: none DOM 유지  ·  실시간 상태 디스패치  ·  세션 복원",
        badge_bg="#0D9488", badge_fg="#CCFBF1"
    )
    
    code = [
        "// 1. 전국 20개 주요 지자체 표준 지오코딩 폴백 좌표 체계",
        "const KOREA_CITY_COORDINATES = {",
        "  서울: { name: '서울특별시청', lat: 37.5665, lon: 126.9780 },",
        "  춘천: { name: '춘천시청',     lat: 37.8813, lon: 127.7298 },",
        "  강릉: { name: '강릉시청',     lat: 37.7519, lon: 128.8761 },",
        "  부산: { name: '부산광역시청', lat: 35.1796, lon: 129.0756 },",
        "};",
        "",
        "// 2. 대화 입력 실시간 워크스페이스 글로벌 상태 동기화",
        "workspaceDispatch({",
        "  type: 'edit',",
        "  patch: {",
        "    origin: draft.originPlace || findFallbackCity(origin),",
        "    destination: draft.destinationPlace || findFallbackCity(dest),",
        "    startDate: draft.startDate,",
        "    mode: draft.mode",
        "  }",
        "});",
        "",
        "// 3. 화면 전환 시 언마운트 없이 상태를 보존하는 DOM 기법",
        "<div style={{ display: planMode === 'chat' ? 'block' : 'none' }}>",
        "  <FullScreenAiChatPlanner",
        "    onSwitchToPlanner={() => setPlanMode('planner')}",
        "  />",
        "</div>"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "FullScreenAiChatPlanner.tsx (React 18)", code, lang="tsx")
    
    cards = [
        {
            "title": "1. 지오코딩 장애 방어 거점 폴백 (Geocoding Fallback)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "외부 맵 API 쿼터 소진 시 전국 20개 시청 표준 좌표 즉시 대체",
                "'출발지 미설정' 에러 차단 및 플래너 생성 파이프라인 유지"
            ]
        },
        {
            "title": "2. DOM 유지 기법 (display: none DOM Preservation)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "언마운트 대신 display: none 전환으로 컴포넌트 생명주기 보존",
                "채팅과 지도 화면 전환 시 지도 타일 및 입력 드래프트 보존"
            ]
        },
        {
            "title": "3. 실시간 글로벌 상태 동기화 (workspaceDispatch)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "대화 중 출발·도착·일정 확정 시마다 실시간 edit 패치 전송",
                "'플래너로 계획 짜기' 클릭 즉시 모든 필드가 선탑재되어 표시"
            ]
        },
        {
            "title": "4. 로컬 스토리지 세션 자동 복구 (Session Persistence)",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "브라우저 LocalStorage 연동으로 새로고침 시 작성 일정 복원",
                "반투명 글래스모피즘 패널 및 반응형 4단계 UI 인터페이스"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 6, 8,
        "지오코딩 폴백과 display: none DOM 보존 기법으로 사용자 입력 데이터 유실을 방지하고 매끄러운 UX를 제공합니다."
    )
    save_and_copy_slide(fig, "slide_06_docker_orchestration.png")


# =============================================================================
# SLIDE 07: PostgreSQL 16 + PostGIS 공간 데이터베이스 스키마 (DataBase)
# =============================================================================
def generate_slide_07():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 7, 8,
        category="[DATABASE & SPATIAL ENGINE]",
        title="07. PostgreSQL 16 + PostGIS 공간 스키마 최적화 (DataBase)",
        subtitle="3단계 자기참조 계층형 카테고리  ·  WGS84 1cm 정밀도  ·  부분 인덱스(Partial Index)  ·  JSONB",
        badge_bg="#312E81", badge_fg="#E0E7FF"
    )
    
    code = [
        "-- 1. 대·중·소 3단계 계층형 카테고리 테이블 (자기참조 FK)",
        "CREATE TABLE place_categories (",
        "    category_id UUID PRIMARY KEY,",
        "    category_code VARCHAR(30) NOT NULL UNIQUE,",
        "    category_level SMALLINT NOT NULL",
        "        CHECK (category_level IN (1, 2, 3)),",
        "    parent_category_id UUID",
        "        REFERENCES place_categories(category_id)",
        ");",
        "",
        "-- 2. 고정밀 관광지 장소 테이블 (WGS84 좌표 제약)",
        "CREATE TABLE places (",
        "    place_id UUID PRIMARY KEY,",
        "    content_id VARCHAR(30) NOT NULL UNIQUE,",
        "    name VARCHAR(255) NOT NULL,",
        "    latitude NUMERIC(10, 7),",
        "    longitude NUMERIC(10, 7),",
        "    category_id UUID",
        "        REFERENCES place_categories(category_id),",
        "    fees JSONB NOT NULL DEFAULT '[]'::jsonb,",
        "    is_active BOOLEAN NOT NULL DEFAULT TRUE,",
        "    CONSTRAINT ck_places_coordinates_pair",
        "        CHECK ((latitude IS NULL) = (longitude IS NULL))",
        ");",
        "",
        "-- 3. 공간 및 조회 성능 최적화 부분 인덱스(Partial Index)",
        "CREATE INDEX ix_places_active_area_type",
        "    ON places (region_code, district_code, content_type_id)",
        "    WHERE is_active;"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "place_schema_v2.sql (PostgreSQL DDL)", code, lang="sql")
    
    cards = [
        {
            "title": "1. 3단계 계층형 카테고리 모델링 (Hierarchical Category)",
            "accent": "#4338CA", "border": "#C7D2FE", "bg": "#EEF2FF",
            "items": [
                "대·중·소분류를 parent_category_id FK 자기참조 정규화",
                "조인 테이블 없이 단일 재귀 CTE 쿼리로 하위 전체 즉각 필터"
            ]
        },
        {
            "title": "2. WGS84 1cm 정밀도 및 좌표쌍 제약 (NUMERIC(10,7))",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "NUMERIC(10,7) 타입으로 전국 지리 좌표 1.1cm 수준 정밀 저장",
                "CHECK((lat IS NULL)=(lon IS NULL)) 제약으로 결측 차단"
            ]
        },
        {
            "title": "3. 부분 인덱스를 통한 공간 성능 최적화 (Partial Index)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "CREATE INDEX ... WHERE is_active로 운영 장소만 인덱싱",
                "비활성 장소 배제로 B-Tree 크기 축소 및 캐시 적중 극대화"
            ]
        },
        {
            "title": "4. 비정형 데이터 수용 JSONB 하이브리드 (Dynamic Schema)",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "다중 사진 URL, 이용 요금(fees)을 JSONB 구조체로 유연 저장",
                "TourAPI 규격 변경 시에도 DDL 마이그레이션 없이 수용 가능"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 7, 8,
        "PostGIS 고정밀 지리 좌표와 부분 인덱스를 통해 대용량 전국 관광 데이터의 공간 쿼리 속도를 극대화합니다."
    )
    save_and_copy_slide(fig, "slide_07_frontend_react.png")


# =============================================================================
# SLIDE 08: 컨테이너 오케스트레이션 및 무결성 백업 체계 (Docker / backups / ETC)
# =============================================================================
def generate_slide_08():
    fig = plt.figure(figsize=(24, 13.5), dpi=200, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    render_slide_header(
        ax, 8, 8,
        category="[INFRASTRUCTURE & RESILIENCE GOVERNANCE]",
        title="08. 컨테이너 격리, 무결성 백업 및 자동화 체계 (Docker / backups / ETC)",
        subtitle="마이크로서비스 브리지 격리  ·  SHA-256 검증 백업  ·  다이어그램 파이프라인  ·  런타임 환경 통제",
        badge_bg="#0F172A", badge_fg="#F8FAFC"
    )
    
    code = [
        "# 1. Docker Compose 마이크로서비스 내부 격리 (docker-compose.yml)",
        "services:",
        "  backend:",
        "    build: { context: ./BackEnd/NestJS }",
        "    networks: [ app-network ]",
        "    environment: [ DB_HOST=host.docker.internal ]",
        "  fastapi:",
        "    build: { context: ./BackEnd/FastAPI }",
        "    networks: [ app-network ]",
        "  frontend:",
        "    build: { context: ./FrontEnd/v1 }",
        "    ports: [ '80:80', '443:443' ]",
        "    volumes: [ /etc/letsencrypt:/etc/letsencrypt:ro ]",
        "",
        "# 2. 무결성 검증 백업 매니페스트 (backups/manifest.json)",
        "{",
        "  'backup_id': 'before-reset-20261022-091558',",
        "  'checksums': {",
        "    'repository.bundle': 'SHA256: 7f3a...b21',",
        "    'working-tree.patch': 'SHA256: 9e4c...d88'",
        "  }",
        "}",
        "",
        "# 3. 다이어그램 일괄 자동 생성 (generate_all_diagrams.py)",
        "for script, output in SCRIPTS:",
        "    subprocess.run([sys.executable, script], check=True)"
    ]
    render_code_window(ax, 3.0, 9.5, 47.0, 73.0, "docker-compose.yml & manifest.json", code, lang="yaml")
    
    cards = [
        {
            "title": "1. 마이크로서비스 브리지 네트워크 격리 (Docker Network)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "FrontEnd, BackEnd, FastAPI를 app-network 내부망으로 격리",
                "Nginx만 80/443 포트 개방 및 SSL 인증서 볼륨 읽기 전용 마운트"
            ]
        },
        {
            "title": "2. SHA-256 체크섬 기반 무결성 백업 (Zero-Loss Backup)",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "DB 리셋 전 Git Bundle 및 패치 생성 후 SHA-256 해시 기록",
                "긴급 장애 발생 시 원본 시점으로 100% 무손실 롤백 보장"
            ]
        },
        {
            "title": "3. 9대 아키텍처 다이어그램 일괄 자동화 (Diagrams as Code)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "generate_all_diagrams.py 마스터 빌더로 원클릭 일괄 동기화",
                "Windows 파일 잠금(PermissionError) 지수 백오프 자동 재시도"
            ]
        },
        {
            "title": "4. 다중 런타임 환경 격리 (Multi-Runtime Governance)",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "Node.js 22(LTS)와 Python 3.10 가상환경을 파일로 고정",
                "Semantic Git 커밋 컨벤션 규격화로 팀 협업 일관성 확보"
            ]
        }
    ]
    render_analysis_cards(ax, 51.5, 9.5, 45.5, 73.0, cards)
    
    render_slide_footer(
        ax, 8, 8,
        "네트워크 격리, SHA-256 무결성 백업, 다이어그램 자동화로 인프라의 재현성과 복원력을 보장합니다."
    )
    save_and_copy_slide(fig, "slide_08_etc_packages_mgmt.png")


# =============================================================================
# 메인 실행 엔트리포인트
# =============================================================================
def main():
    print("=" * 85)
    print("  [I AM YOUR J] 핵심 4대 엔진 & 8대 도메인 코드 심층 분석 PPT 슬라이드 생성 엔진")
    print("=" * 85)
    
    t0 = time.time()
    generators = [
        ("01", "CI/CD 무중단 자동 배포 (.github/workflows)", generate_slide_01),
        ("02", "날씨 예측 ML/DL 모델 훈련 및 추론 (BackEnd/FastAPI)", generate_slide_02),
        ("03", "대화형 AI 여행 플래너 및 설문 파싱 (BackEnd/NestJS)", generate_slide_03),
        ("04", "경로 기반 장소 추천 및 공간 격자 인덱싱 (BackEnd & DataBase)", generate_slide_04),
        ("05", "다중 모달 경로 생성 및 캐시 코디네이터 (BackEnd/NestJS)", generate_slide_05),
        ("06", "React 18 대화형 워크스페이스 및 예외 방어 (FrontEnd/v1)", generate_slide_06),
        ("07", "PostgreSQL 16 + PostGIS 공간 스키마 최적화 (DataBase)", generate_slide_07),
        ("08", "컨테이너 오케스트레이션 및 무결성 백업 체계 (Docker / backups / ETC)", generate_slide_08),
    ]
    
    for idx, title, gen_func in generators:
        print(f"\n▶ [{idx}/8] 슬라이드 생성 중: {title}...")
        st = time.time()
        gen_func()
        print(f"   소요 시간: {time.time() - st:.2f}초")
        
    print("\n" + "=" * 85)
    print(f"  총 8장 고해상도 PPT 슬라이드 생성 완료! (총 소요 시간: {time.time() - t0:.2f}초)")
    print(f"  저장 폴더: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 85)

if __name__ == "__main__":
    main()
