# -*- coding: utf-8 -*-
"""
render_architecture_slides.py
Slide 7(여행 경로 최적화) 및 Slide 15(CI/CD 배포)를 위한
이해하기 쉽고 직관적인 대형 아키텍처 다이어그램 렌더러 (텍스트 패딩 최적화 버전)
"""

import os
import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

def draw_box(ax, x, y, w, h, bg_color, border_color, border_width=2.2, radius=1.0, zorder=2):
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

def draw_arrow(ax, start, end, color='#0284C7', width=2.8, label="", label_pos=0.5, label_offset=(0, 2.2), fontsize=12.2):
    arrow = patches.FancyArrowPatch(
        start, end,
        arrowstyle="-|>",
        color=color,
        linewidth=width,
        mutation_scale=19,
        zorder=6
    )
    ax.add_patch(arrow)
    if label:
        mid_x = start[0] + (end[0] - start[0]) * label_pos + label_offset[0]
        mid_y = start[1] + (end[1] - start[1]) * label_pos + label_offset[1]
        ax.text(
            mid_x, mid_y, label,
            color='#0F172A', fontsize=fontsize, fontweight='bold',
            ha='center', va='center', zorder=7,
            bbox=dict(boxstyle="round,pad=0.30", facecolor="#FFFFFF", edgecolor=color, alpha=0.98, lw=1.6)
        )

# =============================================================================
# SLIDE 7: 여행 이동 경로 최적화 & 길목 명소 큐레이션 아키텍처
# =============================================================================
def generate_slide_07_arch():
    fig = plt.figure(figsize=(24, 11.2), dpi=220, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    # 넉넉한 가로 너비 & 여백 배치
    box_w = 29.8
    box_h = 56.5
    gap_x = 3.8
    start_x = 1.5
    top_y = 38.5
    
    # -------------------------------------------------------------------------
    # STEP 01: OpenRouteService 경로 탐색 & 캐싱
    # -------------------------------------------------------------------------
    x1 = start_x
    draw_box(ax, x1, top_y, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
    draw_box(ax, x1 + 1.0, top_y + box_h - 6.0, box_w - 2.0, 5.0, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
    ax.text(x1 + box_w/2, top_y + box_h - 3.5, "STEP 01. ORS 최적 경로 탐색 & 캐싱", fontsize=16.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    # 카드 1-A: 자차/도보 최적 경로
    draw_box(ax, x1 + 1.2, top_y + 26.0, box_w - 2.4, 22.5, '#FFFFFF', '#FB923C', border_width=1.6, radius=0.8)
    ax.text(x1 + 2.8, top_y + 44.8, "자차 & 도보 최적 경로 분리", fontsize=15.5, fontweight='bold', color='#C2410C', va='center', zorder=4)
    t1_a = (
        "• 자차: 고속·간선도로 최단시간 탐색\n"
        "• 도보: 안전 보행로 중심 경로 산출\n"
        "• 추천(recommended) 및 최단 경로 비교\n"
        "• 대중교통 배제 (자차/도보 2대 수단 특화)"
    )
    ax.text(x1 + 2.8, top_y + 35.5, t1_a, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 카드 1-B: SHA-256 해시 24h 캐싱
    draw_box(ax, x1 + 1.2, top_y + 1.8, box_w - 2.4, 22.5, '#FFFFFF', '#FB923C', border_width=1.6, radius=0.8)
    ax.text(x1 + 2.8, top_y + 20.6, "SHA-256 & Single-Flight 캐싱", fontsize=15.5, fontweight='bold', color='#C2410C', va='center', zorder=4)
    t1_b = (
        "• 출발·도착 좌표 기반 64자리 SHA-256 해시\n"
        "• Single-Flight: 중복 요청 시 단일 호출 병합\n"
        "• 동일 경로 재요청 시 10ms 초고속 캐시 반환\n"
        "• 외부 ORS 호출 85% 대폭 절감 및 쿼터 보호"
    )
    ax.text(x1 + 2.8, top_y + 11.3, t1_b, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # -------------------------------------------------------------------------
    # STEP 02: PostGIS 도로망 5km 공간 버퍼 질의
    # -------------------------------------------------------------------------
    x2 = x1 + box_w + gap_x
    draw_box(ax, x2, top_y, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
    draw_box(ax, x2 + 1.0, top_y + box_h - 6.0, box_w - 2.0, 5.0, '#059669', '#059669', border_width=1.0, radius=0.6)
    ax.text(x2 + box_w/2, top_y + box_h - 3.5, "STEP 02. PostGIS 반경 5km 공간 질의", fontsize=16.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    # 카드 2-A: ST_DWithin 공간 버퍼
    draw_box(ax, x2 + 1.2, top_y + 26.0, box_w - 2.4, 22.5, '#FFFFFF', '#34D399', border_width=1.6, radius=0.8)
    ax.text(x2 + 2.8, top_y + 44.8, "ST_DWithin 5km 공간 버퍼링", fontsize=15.5, fontweight='bold', color='#047857', va='center', zorder=4)
    t2_a = (
        "• 이동 경로 LineString 기준 좌우 5km 버퍼\n"
        "• 도로 선분 최단 수직거리(Point-to-Segment)\n"
        "• GiST R-Tree 인덱스로 30ms 이내 초고속 색인\n"
        "• 동선 이탈 없는 도로변 핵심 명소만 추출"
    )
    ax.text(x2 + 2.8, top_y + 35.5, t2_a, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 카드 2-B: 취향 매핑 & 스마트 랭킹
    draw_box(ax, x2 + 1.2, top_y + 1.8, box_w - 2.4, 22.5, '#FFFFFF', '#34D399', border_width=1.6, radius=0.8)
    ax.text(x2 + 2.8, top_y + 20.6, "취향 매핑 & 스마트 랭킹 큐레이션", fontsize=15.5, fontweight='bold', color='#047857', va='center', zorder=4)
    t2_b = (
        "• 여행자 테마(힐링, 맛집, 역사) 가중치 점수화\n"
        "• 전체 주행 시간 기준 4개 균등 구간 분할 배치\n"
        "• 우회 시간 최소화 알고리즘으로 이동 피로 절감\n"
        "• 숙박(32) 분리 탐색 및 최적 도착시간대 배치"
    )
    ax.text(x2 + 2.8, top_y + 11.3, t2_b, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # -------------------------------------------------------------------------
    # STEP 03: TourAPI 연동 & Leaflet 시각화
    # -------------------------------------------------------------------------
    x3 = x2 + box_w + gap_x
    draw_box(ax, x3, top_y, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
    draw_box(ax, x3 + 1.0, top_y + box_h - 6.0, box_w - 2.0, 5.0, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
    ax.text(x3 + box_w/2, top_y + box_h - 3.5, "STEP 03. TourAPI 연동 & 타임라인", fontsize=16.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    # 카드 3-A: TourAPI 4.0 실시간 결합
    draw_box(ax, x3 + 1.2, top_y + 26.0, box_w - 2.4, 22.5, '#FFFFFF', '#38BDF8', border_width=1.6, radius=0.8)
    ax.text(x3 + 2.8, top_y + 44.8, "한국관광공사 TourAPI 4.0 결합", fontsize=15.5, fontweight='bold', color='#0369A1', va='center', zorder=4)
    t3_a = (
        "• 관광(12)·문화(14)·숙박(32)·식음(39) 계층 매핑\n"
        "• 고화질 대표 썸네일 이미지 및 상세 주소 결합\n"
        "• 한국관광공사 공식 최신 POI 메타데이터 연동\n"
        "• 외부 API 장애 시 전국 20개 지자체 표준 Fallback"
    )
    ax.text(x3 + 2.8, top_y + 35.5, t3_a, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 카드 3-B: Leaflet 지도 & 타임라인
    draw_box(ax, x3 + 1.2, top_y + 1.8, box_w - 2.4, 22.5, '#FFFFFF', '#38BDF8', border_width=1.6, radius=0.8)
    ax.text(x3 + 2.8, top_y + 20.6, "Leaflet 지도 & 시공간 선형 보간", fontsize=15.5, fontweight='bold', color='#0369A1', va='center', zorder=4)
    t3_b = (
        "• GeoJSON Polyline 고정밀 도로 궤적 부드러운 렌더링\n"
        "• 선형 보간(Linear Interpolation) 도착 예정 역산\n"
        "• 경유지 순서 변경 시 10ms 실시간 재계산 반영\n"
        "• 총 주행거리·소요시간 대시보드 실시간 동기화"
    )
    ax.text(x3 + 2.8, top_y + 11.3, t3_b, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 스텝 간 연결 화살표
    draw_arrow(ax, (x1 + box_w, top_y + box_h - 3.5), (x2, top_y + box_h - 3.5), color='#059669', width=2.8,
               label="경로 LineString", label_offset=(0, 3.0), fontsize=11.8)
    draw_arrow(ax, (x2 + box_w, top_y + box_h - 3.5), (x3, top_y + box_h - 3.5), color='#0284C7', width=2.8,
               label="길목 명소 리스트", label_offset=(0, 3.0), fontsize=11.8)
    
    # -------------------------------------------------------------------------
    # 하단 기반 인프라: PostgreSQL 16 + PostGIS 공간 데이터베이스
    # -------------------------------------------------------------------------
    db_w = 97.0
    db_x = start_x
    db_h = 28.0
    db_y = 3.5
    draw_box(ax, db_x, db_y, db_w, db_h, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
    draw_box(ax, db_x + 1.0, db_y + db_h - 5.0, db_w - 2.0, 4.2, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
    ax.text(50.0, db_y + db_h - 2.9, "기반 인프라: PostgreSQL 16 + PostGIS 공간 데이터베이스 (AWS EC2 Native 직접 구축 + EBS SSD)",
            fontsize=15.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    col_w = (db_w - 4.0) / 3
    # DB 카드 1
    c1_x = db_x + 1.0
    draw_box(ax, c1_x, db_y + 1.5, col_w, 20.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
    ax.text(c1_x + col_w/2, db_y + 18.0, "1. tour_places 공간 POI 테이블", fontsize=15.0, fontweight='bold', color='#3730A3', ha='center', va='center', zorder=4)
    t_c1 = (
        "• 전국 5만 건 한국관광공사 POI 적재\n"
        "• geom(Point, 4326) WGS84 공간 좌표계\n"
        "• 운영 중인 장소만 Partial Index 최적화"
    )
    ax.text(c1_x + col_w/2, db_y + 9.5, t_c1, fontsize=12.8, color='#1E293B', linespacing=1.6, ha='center', va='center', zorder=4)
    
    # DB 카드 2
    c2_x = c1_x + col_w + 1.0
    draw_box(ax, c2_x, db_y + 1.5, col_w, 20.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
    ax.text(c2_x + col_w/2, db_y + 18.0, "2. ors_route_cache 경로 캐시", fontsize=15.0, fontweight='bold', color='#3730A3', ha='center', va='center', zorder=4)
    t_c2 = (
        "• SHA-256 64자리 핑거프린트 Primary Key\n"
        "• GeoJSON 도로망 LineString 지오메트리 캐싱\n"
        "• 24시간 TTL 자동 만료 및 무결성 유지"
    )
    ax.text(c2_x + col_w/2, db_y + 9.5, t_c2, fontsize=12.8, color='#1E293B', linespacing=1.6, ha='center', va='center', zorder=4)
    
    # DB 카드 3
    c3_x = c2_x + col_w + 1.0
    draw_box(ax, c3_x, db_y + 1.5, col_w, 20.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
    ax.text(c3_x + col_w/2, db_y + 18.0, "3. GiST 공간 인덱스 초고속 질의", fontsize=15.0, fontweight='bold', color='#3730A3', ha='center', va='center', zorder=4)
    t_c3 = (
        "• GiST R-Tree 2차원 공간 색인 적용\n"
        "• ST_DWithin 풀스캔 완전 배제 (30ms 응답)\n"
        "• EC2 Native SSD 직접 I/O로 병목 제로"
    )
    ax.text(c3_x + col_w/2, db_y + 9.5, t_c3, fontsize=12.8, color='#1E293B', linespacing=1.6, ha='center', va='center', zorder=4)
    
    # DB와 STEP 02 간 수직 연결 화살표
    draw_arrow(ax, (50.0, db_y + db_h), (50.0, top_y), color='#4F46E5', width=2.8,
               label="PostGIS 반경 5km 공간 질의 & 캐시 읽기", label_pos=0.5, label_offset=(15.5, 0), fontsize=11.8)
    
    out_path = "slide_07_arch_diagram.png"
    fig.savefig(out_path, dpi=220, bbox_inches='tight', facecolor='#FFFFFF', pad_inches=0.08)
    plt.close(fig)
    print(f"Generated: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")


# =============================================================================
# SLIDE 15: GitHub Actions & Docker 무중단 자동 배포 아키텍처
# =============================================================================
def generate_slide_15_arch():
    fig = plt.figure(figsize=(24, 11.2), dpi=220, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    box_w = 29.8
    box_h = 56.5
    gap_x = 3.8
    start_x = 1.5
    top_y = 38.5
    
    # -------------------------------------------------------------------------
    # STEP 01: GitHub Cloud CI 빌드 (ubuntu-latest)
    # -------------------------------------------------------------------------
    x1 = start_x
    draw_box(ax, x1, top_y, box_w, box_h, '#F0F9FF', '#0284C7', border_width=2.5, radius=1.2)
    draw_box(ax, x1 + 1.0, top_y + box_h - 6.0, box_w - 2.0, 5.0, '#0284C7', '#0284C7', border_width=1.0, radius=0.6)
    ax.text(x1 + box_w/2, top_y + box_h - 3.5, "STEP 01. GitHub Cloud CI 빌드", fontsize=16.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    # 카드 1-A: main 브랜치 감지 & 동시성 제어
    draw_box(ax, x1 + 1.2, top_y + 26.0, box_w - 2.4, 22.5, '#FFFFFF', '#38BDF8', border_width=1.6, radius=0.8)
    ax.text(x1 + 2.8, top_y + 44.8, "main 브랜치 푸시 & 동시성 제어", fontsize=15.5, fontweight='bold', color='#0369A1', va='center', zorder=4)
    t1_a = (
        "• git push origin main 감지 시 자동 실행\n"
        "• GitHub 클라우드 VM(ubuntu-latest) 격리 빌드\n"
        "• Concurrency: cancel-in-progress 경합 차단\n"
        "• npm 캐시(cache: 'npm')로 빌드 시간 60% 단축"
    )
    ax.text(x1 + 2.8, top_y + 35.5, t1_a, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 카드 1-B: 정적 컴파일 & Fail-Fast 검증
    draw_box(ax, x1 + 1.2, top_y + 1.8, box_w - 2.4, 22.5, '#FFFFFF', '#38BDF8', border_width=1.6, radius=0.8)
    ax.text(x1 + 2.8, top_y + 20.6, "정적 컴파일 & Fail-Fast 사전 검증", fontsize=15.5, fontweight='bold', color='#0369A1', va='center', zorder=4)
    t1_b = (
        "• React 18: Vite 번들러 프로덕션 빌드(dist/)\n"
        "• TypeScript 엄격 컴파일(tsc)로 타입 에러 차단\n"
        "• 에러 시 즉시 중단(Fail-Fast) 및 PR Red X 알림\n"
        "• upload-artifact@v4로 번들 산출물 안전 인계"
    )
    ax.text(x1 + 2.8, top_y + 11.3, t1_b, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # -------------------------------------------------------------------------
    # STEP 02: EC2 Self-Hosted Runner 보안 배포
    # -------------------------------------------------------------------------
    x2 = x1 + box_w + gap_x
    draw_box(ax, x2, top_y, box_w, box_h, '#F0FDF4', '#059669', border_width=2.5, radius=1.2)
    draw_box(ax, x2 + 1.0, top_y + box_h - 6.0, box_w - 2.0, 5.0, '#059669', '#059669', border_width=1.0, radius=0.6)
    ax.text(x2 + box_w/2, top_y + box_h - 3.5, "STEP 02. EC2 Self-Hosted Runner", fontsize=16.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    # 카드 2-A: SSH 미개방 보안 통신
    draw_box(ax, x2 + 1.2, top_y + 26.0, box_w - 2.4, 22.5, '#FFFFFF', '#34D399', border_width=1.6, radius=0.8)
    ax.text(x2 + 2.8, top_y + 44.8, "인하우스 러너 SSH 미개방 통신", fontsize=15.5, fontweight='bold', color='#047857', va='center', zorder=4)
    t2_a = (
        "• AWS EC2 내부 상주 러너([self-hosted, linux])\n"
        "• 외부 인바운드 SSH(22) 미개방 보안 배포\n"
        "• GitHub 서버와 아웃바운드 HTTPS 웹소켓 통신\n"
        "• clean: false로 서버 내 .env 운영 환경변수 보존"
    )
    ax.text(x2 + 2.8, top_y + 35.5, t2_a, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 카드 2-B: 사전 스냅샷 백업 & 산출물 수신
    draw_box(ax, x2 + 1.2, top_y + 1.8, box_w - 2.4, 22.5, '#FFFFFF', '#34D399', border_width=1.6, radius=0.8)
    ax.text(x2 + 2.8, top_y + 20.6, "사전 스냅샷 백업 & 산출물 수신", fontsize=15.5, fontweight='bold', color='#047857', va='center', zorder=4)
    t2_b = (
        "• download-artifact@v4로 클라우드 dist/ 수신\n"
        "• 배포 직전 기존 폴더를 backups/ 타임스탬프 백업\n"
        "• SHA-256 체크섬으로 빌드 산출물 무결성 검증\n"
        "• 장애 발생 시 1초 만에 직전 버전 즉각 롤백 체계"
    )
    ax.text(x2 + 2.8, top_y + 11.3, t2_b, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # -------------------------------------------------------------------------
    # STEP 03: Docker 무중단 롤아웃 & 헬스체크
    # -------------------------------------------------------------------------
    x3 = x2 + box_w + gap_x
    draw_box(ax, x3, top_y, box_w, box_h, '#FFF7ED', '#EA580C', border_width=2.5, radius=1.2)
    draw_box(ax, x3 + 1.0, top_y + box_h - 6.0, box_w - 2.0, 5.0, '#EA580C', '#EA580C', border_width=1.0, radius=0.6)
    ax.text(x3 + box_w/2, top_y + box_h - 3.5, "STEP 03. Docker 무중단 배포 & 자가치유", fontsize=16.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    # 카드 3-A: Docker Compose 핫스왑
    draw_box(ax, x3 + 1.2, top_y + 26.0, box_w - 2.4, 22.5, '#FFFFFF', '#FB923C', border_width=1.6, radius=0.8)
    ax.text(x3 + 2.8, top_y + 44.8, "Docker Compose 핫스왑 교체", fontsize=15.5, fontweight='bold', color='#C2410C', va='center', zorder=4)
    t3_a = (
        "• docker compose up -d --build --no-deps 실행\n"
        "• FrontEnd / FastAPI / NestJS 선별 핫스왑 교체\n"
        "• dist/ 디렉토리 원자적 심볼릭 교체 & Nginx reload\n"
        "• 사용자 접속 끊김 없는 0초 무중단 롤아웃 실현"
    )
    ax.text(x3 + 2.8, top_y + 35.5, t3_a, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 카드 3-B: 헬스체크 & 불사조 자가 치유
    draw_box(ax, x3 + 1.2, top_y + 1.8, box_w - 2.4, 22.5, '#FFFFFF', '#FB923C', border_width=1.6, radius=0.8)
    ax.text(x3 + 2.8, top_y + 20.6, "다단계 헬스체크 & 불사조 자가 치유", fontsize=15.5, fontweight='bold', color='#C2410C', va='center', zorder=4)
    t3_b = (
        "• 배포 직후 /api/health 엔드포인트 5회 재시도 검증\n"
        "• 실패 시 docker logs 50줄 덤프 후 자동 롤백\n"
        "• restart: always 정책으로 크래시 시 3초 내 부활\n"
        "• 24시간 서비스 가용성(SLA) 99.9% 무중단 유지"
    )
    ax.text(x3 + 2.8, top_y + 11.3, t3_b, fontsize=12.6, color='#1E293B', linespacing=1.65, va='center', zorder=4)
    
    # 스텝 간 연결 화살표
    draw_arrow(ax, (x1 + box_w, top_y + box_h - 3.5), (x2, top_y + box_h - 3.5), color='#059669', width=2.8,
               label="검증된 번들 전달", label_offset=(0, 3.0), fontsize=11.8)
    draw_arrow(ax, (x2 + box_w, top_y + box_h - 3.5), (x3, top_y + box_h - 3.5), color='#EA580C', width=2.8,
               label="무중단 교체 실행", label_offset=(0, 3.0), fontsize=11.8)
    
    # -------------------------------------------------------------------------
    # 하단 기반 인프라: PostgreSQL 호스트 Native 격리 & 영구 가동
    # -------------------------------------------------------------------------
    db_w = 97.0
    db_x = start_x
    db_h = 28.0
    db_y = 3.5
    draw_box(ax, db_x, db_y, db_w, db_h, '#EEF2FF', '#4F46E5', border_width=2.5, radius=1.2)
    draw_box(ax, db_x + 1.0, db_y + db_h - 5.0, db_w - 2.0, 4.2, '#4F46E5', '#4F46E5', border_width=1.0, radius=0.6)
    ax.text(50.0, db_y + db_h - 2.9, "데이터 무결성: 배포 중에도 PostgreSQL 16 DB는 EC2 호스트에서 영구 무중단 가동 (Native 격리)",
            fontsize=15.5, fontweight='bold', color='#FFFFFF', ha='center', va='center', zorder=4)
    
    col_w = (db_w - 4.0) / 3
    # 카드 1
    c1_x = db_x + 1.0
    draw_box(ax, c1_x, db_y + 1.5, col_w, 20.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
    ax.text(c1_x + col_w/2, db_y + 18.0, "1. DB 영구 무중단 커넥션 유지", fontsize=15.0, fontweight='bold', color='#3730A3', ha='center', va='center', zorder=4)
    t_c1 = (
        "• 도커 컨테이너 재빌드/재시작 영향 0%\n"
        "• 배포 중 실시간 유입 트랜잭션 정상 처리\n"
        "• 5만 건 관광지 POI 및 경로 캐시 보존"
    )
    ax.text(c1_x + col_w/2, db_y + 9.5, t_c1, fontsize=12.8, color='#1E293B', linespacing=1.6, ha='center', va='center', zorder=4)
    
    # 카드 2
    c2_x = c1_x + col_w + 1.0
    draw_box(ax, c2_x, db_y + 1.5, col_w, 20.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
    ax.text(c2_x + col_w/2, db_y + 18.0, "2. AWS EBS GP3 디스크 무결성 보호", fontsize=15.0, fontweight='bold', color='#3730A3', ha='center', va='center', zorder=4)
    t_c2 = (
        "• AWS EBS GP3 SSD 볼륨 마운트 지속\n"
        "• 배포 중 디스크 I/O 중단 및 지연 제로\n"
        "• 데이터 손실/불일치 위험 100% 원천 배제"
    )
    ax.text(c2_x + col_w/2, db_y + 9.5, t_c2, fontsize=12.8, color='#1E293B', linespacing=1.6, ha='center', va='center', zorder=4)
    
    # 카드 3
    c3_x = c2_x + col_w + 1.0
    draw_box(ax, c3_x, db_y + 1.5, col_w, 20.5, '#FFFFFF', '#818CF8', border_width=1.5, radius=0.8)
    ax.text(c3_x + col_w/2, db_y + 18.0, "3. 진정한 Zero-Downtime 달성", fontsize=15.0, fontweight='bold', color='#3730A3', ha='center', va='center', zorder=4)
    t_c3 = (
        "• Nginx 프록시 유지 상태로 백엔드 순차 교체\n"
        "• 사용자 화면에서 '서버 점검 중' 에러 0초\n"
        "• 배포 완료 즉시 신규 기능 실시간 활성화"
    )
    ax.text(c3_x + col_w/2, db_y + 9.5, t_c3, fontsize=12.8, color='#1E293B', linespacing=1.6, ha='center', va='center', zorder=4)
    
    # 연결 화살표
    draw_arrow(ax, (50.0, db_y + db_h), (50.0, top_y), color='#4F46E5', width=2.8,
               label="DB 무중단 커넥션 풀 연결 유지 보장", label_pos=0.5, label_offset=(15.5, 0), fontsize=11.8)
    
    out_path = "slide_15_arch_diagram.png"
    fig.savefig(out_path, dpi=220, bbox_inches='tight', facecolor='#FFFFFF', pad_inches=0.08)
    plt.close(fig)
    print(f"Generated: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")

if __name__ == "__main__":
    generate_slide_07_arch()
    generate_slide_15_arch()
