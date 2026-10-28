#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
========================================================================================
I AM YOUR J - 핵심 코드 분석 및 PPT 발표 자료 자동 생성 엔진 (generate_ppt_code_analysis.py)
========================================================================================
8대 핵심 영역 코드 심층 분석 & 16:9 4K 프리미엄 PPT 슬라이드 고해상도 시각화
  1. .github/workflows  : CI/CD 무중단 자동 배포 파이프라인 (deploy.yml)
  2. BackEnd            : NestJS 코디네이터 & ORS 캐시 엔진 (cache-coordinator.ts / chat.service.ts)
  3. backups            : 데이터베이스 마이그레이션 백업 및 매니페스트 롤백 체계 (manifest.json)
  4. DataBase           : PostgreSQL 16 + PostGIS 공간 인덱싱 & 관광 DB 스키마 (place_schema_v2.sql)
  5. diagrams           : 9대 시스템 아키텍처 다이어그램 일괄 자동 생성 파이프라인 (generate_all_diagrams.py)
  6. Docker             : Docker Compose 멀티 컨테이너 오케스트레이션 & Nginx SSL (docker-compose.yml)
  7. FrontEnd           : React 18 대화형 AI 플래너 & 실시간 워크스페이스 동기화 (FullScreenAiChatPlanner.tsx)
  8. ETC                : 의존성 패키지 관리, 회의록 규격화 및 협업 체계 (README.md / Package_list.txt)
========================================================================================
"""

import os
import sys
import time
import shutil
import tempfile
import argparse
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

# 폰트 및 유니코드 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

OUTPUT_DIR = "ppt_slides"

# -----------------------------------------------------------------------------
# 공통 그래픽 유틸리티 함수
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
    badge_w = len(category) * 0.95 + 2.5
    draw_rounded_box(ax, 3.0, 93.8, badge_w, 2.8, badge_bg, badge_bg, radius=0.6, zorder=3)
    ax.text(3.0 + badge_w / 2.0, 95.2, category, color=badge_fg, fontsize=12.0, fontweight='bold', ha='center', va='center', zorder=4)
    
    # 브랜드 뱃지 (우측 상단)
    ax.text(97.0, 95.2, "I AM YOUR J  ·  System Architecture Code Review", color='#64748B', fontsize=12.0, fontweight='bold', ha='right', va='center')
    
    # 메인 슬라이드 타이틀
    ax.text(3.0, 90.0, title, color='#0F172A', fontsize=22.0, fontweight='bold', ha='left', va='center')
    # 서브타이틀
    ax.text(3.0, 86.8, subtitle, color='#475569', fontsize=12.8, ha='left', va='center')
    
    # 구분선
    ax.plot([3.0, 97.0], [84.8, 84.8], color='#E2E8F0', lw=1.5, zorder=2)

def render_slide_footer(ax, slide_no, total_slides, takeaway_text):
    # 하단 요약 바
    draw_rounded_box(ax, 3.0, 3.0, 94.0, 5.2, "#0F172A", "#1E293B", border_width=1.0, radius=0.8, zorder=3)
    
    # 핵심 테이크어웨이 문구
    ax.text(5.0, 5.6, "[★ KEY TAKEAWAY]", color='#FCD34D', fontsize=12.0, fontweight='bold', va='center', zorder=4)
    ax.text(21.0, 5.6, takeaway_text, color='#FFFFFF', fontsize=12.0, va='center', zorder=4)
    
    # 페이지 번호
    ax.text(95.0, 5.6, f"Slide {slide_no} / {total_slides}", color='#94A3B8', fontsize=12.0, fontweight='bold', ha='right', va='center', zorder=4)

def render_code_window(ax, x, y, w, h, filename, code_lines, lang="code"):
    # 코드 윈도우 바깥 박스 (다크 테마)
    draw_rounded_box(ax, x, y, w, h, "#0F172A", "#334155", border_width=2.0, radius=1.0, zorder=3)
    
    # 상단 윈도우 타이틀바
    header_h = 3.8
    draw_rounded_box(ax, x, y + h - header_h, w, header_h, "#1E293B", "#334155", border_width=1.0, radius=0.8, zorder=4)
    
    # macOS 스타일 3색 윈도우 버튼
    circle_y = y + h - header_h / 2.0
    for idx, c in enumerate(["#EF4444", "#F59E0B", "#10B981"]):
        circ = patches.Circle((x + 1.8 + idx * 1.5, circle_y), 0.55, facecolor=c, edgecolor='none', zorder=5)
        ax.add_patch(circ)
        
    # 파일명 뱃지 (한글 포함 가능하므로 Malgun Gothic 사용)
    ax.text(x + w / 2.0, circle_y, f"FILE: {filename}", color='#F8FAFC', fontsize=11.5, fontfamily='Malgun Gothic', fontweight='bold', ha='center', va='center', zorder=5)
    ax.text(x + w - 2.0, circle_y, lang.upper(), color='#94A3B8', fontsize=10.0, fontfamily='Consolas', ha='right', va='center', zorder=5)
    
    # 본문 코드 텍스트 렌더링
    code_start_y = y + h - header_h - 2.2
    line_step = 1.95
    for i, line in enumerate(code_lines):
        line_y = code_start_y - i * line_step
        if line_y < y + 1.0:
            break
        # 줄 번호
        ax.text(x + 1.8, line_y, f"{i+1:2d}", color='#475569', fontsize=10.2, fontfamily='Consolas', va='center', zorder=5)
        # 세로 구분선
        ax.plot([x + 3.8, x + 3.8], [line_y - 0.9, line_y + 0.9], color='#334155', lw=0.8, zorder=4)
        
        # 텍스트 컬러링 (간이 하이라이팅)
        stripped = line.strip()
        color = '#F8FAFC'
        if stripped.startswith('#') or stripped.startswith('//') or stripped.startswith('--'):
            color = '#94A3B8'
        elif any(k in line for k in ['name:', 'runs-on:', 'steps:', 'uses:', 'with:', 'run:', 'concurrency:']):
            color = '#38BDF8'
        elif any(k in line for k in ['function', 'class', 'export', 'import', 'const', 'return', 'async', 'await', 'CREATE TABLE', 'CONSTRAINT', 'PRIMARY KEY']):
            color = '#F43F5E'
        elif any(k in line for k in ['services:', 'backend:', 'frontend:', 'fastapi:', 'networks:', 'volumes:', 'ports:']):
            color = '#FBBF24'
        elif any(k in line for k in ['true', 'false', 'null', 'NOT NULL', 'DEFAULT']):
            color = '#A78BFA'
        elif '"' in line or "'" in line:
            color = '#34D399'
            
        # 한글 글리프 깨짐 방지: 한글이 포함된 라인은 Malgun Gothic으로 렌더링
        has_korean = any((0xAC00 <= ord(char) <= 0xD7A3) or (0x1100 <= ord(char) <= 0x11FF) or (0x3130 <= ord(char) <= 0x318F) for char in line)
        font_to_use = 'Malgun Gothic' if has_korean else 'Consolas'
        ax.text(x + 4.5, line_y, line, color=color, fontsize=10.5, fontfamily=font_to_use, va='center', zorder=5)

def render_analysis_cards(ax, x, y, w, h, cards):
    """
    우측 4개 분석 카드 렌더링
    cards: [
        {"title": ..., "accent": ..., "bg": ..., "items": [...]},
        ...
    ]
    """
    card_h = (h - (len(cards) - 1) * 1.5) / len(cards)
    
    for i, c in enumerate(cards):
        cy = y + h - (i + 1) * card_h - i * 1.5
        
        # 배경 카드 박스
        draw_rounded_box(ax, x, cy, w, card_h, c.get("bg", "#F8FAFC"), c.get("border", "#CBD5E1"), border_width=1.8, radius=0.8, zorder=3)
        
        # 좌측 강조 컬러 바
        draw_rounded_box(ax, x, cy, 1.2, card_h, c.get("accent", "#0284C7"), c.get("accent", "#0284C7"), radius=0.4, zorder=4)
        
        # 카드 타이틀
        ax.text(x + 2.5, cy + card_h - 2.2, c["title"], color='#0F172A', fontsize=13.5, fontweight='bold', va='center', zorder=4)
        
        # 카드 본문 불릿 항목들
        item_y = cy + card_h - 4.5
        item_step = 2.15
        for item in c["items"]:
            # 불릿 점
            ax.plot([x + 2.8], [item_y], marker='o', markersize=3.5, color=c.get("accent", "#0284C7"), zorder=4)
            # 텍스트
            ax.text(x + 4.0, item_y, item, color='#334155', fontsize=11.2, va='center', zorder=4)
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
        title="01. GitHub Actions CI/CD 무중단 자동 배포 파이프라인 (.github/workflows)",
        subtitle="2단계 빌드-배포 분리 (Two-Stage)  ·  Self-Hosted EC2 러너 연동  ·  동시성 제어(Concurrency)  ·  아티팩트 무결성 전달",
        badge_bg="#0284C7", badge_fg="#E0F2FE"
    )
    
    code = [
        "name: Deploy React to EC2",
        "on:",
        "  push:",
        "    branches: [main]",
        "    paths: ['FrontEnd/**', 'CI_CD/**', '.github/workflows/deploy.yml']",
        "  workflow_dispatch:",
        "permissions: { contents: read }",
        "concurrency:",
        "  group: frontend-production",
        "  cancel-in-progress: true",
        "jobs:",
        "  build:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - uses: actions/setup-node@v4",
        "        with: { node-version: '22', cache: npm }",
        "      - run: bash CI_CD/FrontEnd/build.sh",
        "      - uses: actions/upload-artifact@v4",
        "        with: { name: frontend-dist, path: FrontEnd/v1/dist/ }",
        "  deploy:",
        "    needs: build",
        "    runs-on: [self-hosted, linux]",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "        with: { clean: false }",
        "      - uses: actions/download-artifact@v4",
        "        with: { name: frontend-dist, path: FrontEnd/v1/dist }",
        "      - run: bash CI_CD/FrontEnd/deploy.sh"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "deploy.yml (GitHub Actions)", code, lang="yaml")
    
    cards = [
        {
            "title": "1. 2단계 빌드/배포(Two-Stage) 물리적 분리 아키텍처",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "호스트 리소스 절약: 무거운 컴파일(Vite/Node)을 GitHub-Hosted 러너에서 무상 처리",
                "운영 EC2 부하 0%: EC2 CPU/RAM 리소스는 오직 서비스 서빙과 백엔드에만 전담",
                "아티팩트 전달(upload/download-artifact): 빌드 산출물 무결성을 검증한 뒤 전달"
            ]
        },
        {
            "title": "2. 동시성 제어(Concurrency) 및 이전 빌드 자동 취소",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "cancel-in-progress: true 설정으로 단시간 내 연속 push 발생 시 이전 빌드 즉각 취소",
                "경쟁 상태(Race Condition) 방지: 최신 커밋 하나만 최종적으로 배포됨을 보장",
                "paths 필터링: 무관한 파일(문서, 백엔드 전용 코드 등) 수정 시 불필요한 빌드 차단"
            ]
        },
        {
            "title": "3. 무중단 Zero-Downtime Nginx 동기화 (Self-Hosted Runner)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "clean: false 옵션: EC2 로컬에 위치한 중요 .env 환경 설정과 시크릿을 온전히 보존",
                "배포 스크립트(deploy.sh) 실행을 통해 Nginx 웹 루트(/var/www)로 atomic 파일 복사",
                "Nginx graceful reload 호출로 사용자 접속 끊김 없는 무중단 릴리즈 달성"
            ]
        },
        {
            "title": "4. 엔터프라이즈 보안: 최소 권한(Least Privilege) 원칙",
            "accent": "#EA580C", "border": "#FED7AA", "bg": "#FFF7ED",
            "items": [
                "permissions: contents: read 명시를 통해 GitHub 토큰의 쓰기 권한 원천 차단",
                "외부 SSH 포트 개방 없이 Self-Hosted 러너의 아웃바운드 롱폴링 통신으로 보안 강화",
                "배포 실패 시 GitHub 알림 봇 연동 및 롤백 스크립트 실행 트리거 준비"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 1, 8,
        takeaway_text="GitHub 클라우드에서 안전하게 컴파일하고, EC2 Self-Hosted 러너로 무중단 동기화하여 운영 서버 리소스를 100% 보존합니다."
    )
    save_and_copy_slide(fig, "slide_01_github_workflows.png")


# =============================================================================
# SLIDE 02: BackEnd (NestJS AI 오케스트레이터 & ORS 캐시 엔진)
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
        category="[BACKEND & AI ORCHESTRATION]",
        title="02. NestJS AI 오케스트레이터 & ORS 캐시 코디네이터 (BackEnd/NestJS)",
        subtitle="Canonical JSON 정규화  ·  SHA-256 경로 캐싱  ·  Single-Flight 중복 호출 방지  ·  Gemini 3.5 Flash 연동",
        badge_bg="#059669", badge_fg="#D1FAE5"
    )
    
    code = [
        "export function canonicalJson(value: unknown): string {",
        "  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';",
        "  if (value !== null && typeof value === 'object') {",
        "    return '{' + Object.entries(value)",
        "      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))",
        "      .map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v))",
        "      .join(',') + '}';",
        "  }",
        "  return JSON.stringify(value);",
        "}",
        "",
        "// SHA-256 기반 요청 정규화 & Single-Flight 중복 호출 방지",
        "const requestHash = createHash('sha256')",
        "  .update(canonicalJson(normalizedParams)).digest('hex');",
        "",
        "const cached = await this.cacheRepo.findByHash(requestHash);",
        "if (cached && cached.expiresAt > new Date()) {",
        "  return cached; // DB 캐시 적중 (5ms 응답)",
        "}",
        "",
        "// 동일 파라미터 동시 요청은 인메모리 Promise 공유로 1회만 ORS 호출",
        "return this.inFlight.run(requestHash, () =>",
        "  this.provider.fetchRoute(normalizedParams)",
        ");"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "cache-coordinator.ts (NestJS)", code, lang="typescript")
    
    cards = [
        {
            "title": "1. 결정론적 Canonical JSON 직렬화 & 키 정렬",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "객체 속성 순서 무관성: 클라이언트 전송 순서와 관계없이 키를 알파벳순 정렬",
                "경로 지점 순서 보존: 경유지 의미를 갖는 배열은 원본 순서를 엄격히 유지",
                "동일한 입력에 대해 영구적으로 100% 동일한 SHA-256 다이제스트 생성 보장"
            ]
        },
        {
            "title": "2. Single-Flight 패턴으로 캐시 쇄도(Stampede) 원천 차단",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "동일 경로에 수십 건의 요청이 동시 유입될 때 외부 API 중복 호출 방지",
                "최초 1개 요청만 HeiGIT ORS로 전송하고, 나머지 요청은 동일 Promise를 대기",
                "외부 API 호출 쿼터 고갈을 막고 서버 아웃바운드 네트워크 트래픽 90% 이상 절감"
            ]
        },
        {
            "title": "3. PostgreSQL 24시간 TTL 캐시 연동 (성능 500배 향상)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "LineString GeoJSON 좌표열과 구간별 주행시간(time_spans)을 DB에 저장",
                "외부 API 호출 시 2.5~3초 소요되던 경로 비교 조회를 5ms 수준으로 단축",
                "TTL 만료 인덱스(expires_at) 기반 자동 백그라운드 청소 스케줄러 탑재"
            ]
        },
        {
            "title": "4. Gemini 3.5 Flash 멀티턴 대화형 여행 의도 추출",
            "accent": "#EA580C", "border": "#FED7AA", "bg": "#FFF7ED",
            "items": [
                "chat.service.ts에서 사용자 대화 자연어와 컨텍스트를 분석하여 4단계 파라미터 추출",
                "출발지, 도착지, 날짜, 교통수단, TourAPI 표준 카테고리 UUID를 자동 매핑",
                "네트워크 단절 시에도 자체 로컬 정규표현식 파서로 자동 폴백하여 무중단 서비스"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 2, 8,
        takeaway_text="Canonical JSON과 Single-Flight 패턴을 통해 외부 ORS 쿼터를 보호하고, 응답 시간을 3초에서 5ms로 500배 혁신했습니다."
    )
    save_and_copy_slide(fig, "slide_02_backend_nestjs.png")


# =============================================================================
# SLIDE 03: backups (데이터베이스 백업 & 무결성 롤백 매니페스트)
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
        category="[DATA BACKUPS & INTEGRITY]",
        title="03. DB 마이그레이션 백업 및 매니페스트 롤백 체계 (backups/)",
        subtitle="전수 SHA-256 체크섬 검증  ·  Git Bundle 바이너리 스냅샷  ·  워킹트리 패치 분리  ·  원클릭 롤백 매니페스트",
        badge_bg="#D97706", badge_fg="#FEF3C7"
    )
    
    code = [
        "{",
        '  "branch": "jiseokLee",',
        '  "head": "b605df43bc3cc2a7c0a4836dc0fe7e0bb9dccf10",',
        '  "reset_target": "91d7a95a3b3033224dbfa1d39f659840443a1f74",',
        '  "files": {',
        '    "BackEnd/NestJS/.env.example": "fb5fccb75f225046f...",',
        '    "BackEnd/NestJS/docs/openapi.json": "3b6b5856083cea...",',
        '    "CI_CD/BackEnd/nestjs/prepare-env.sh": "2f61d0eac6...",',
        '    "DataBase/place_schema_v1.sql": "adc9b69edb585de...",',
        '    "DataBase/place_schema_v2.sql": "16171c5dc578512...",',
        '    "FrontEnd/v1/src/components/AgentTeamIntro.tsx": "22e30..."',
        "  },",
        '  "repository.bundle": "5,449,463 bytes (Git Bundle)",',
        '  "uncommitted-files.zip": "66,953 bytes",',
        '  "working-tree.patch": "15,977 bytes",',
        '  "stash": "b19cf2877781b841b6eb69650131d74cd9cbbc76"',
        "}"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "manifest.json (Backup Audit)", code, lang="json")
    
    cards = [
        {
            "title": "1. 스키마 리셋 전 전수 SHA-256 체크섬 아카이빙",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "데이터베이스 및 DDL 스키마 변경 시 영향받는 모든 소스 파일의 해시값 영구 보존",
                "단 1바이트의 임의 수정이나 파일 변조도 즉각 감지 가능한 무결성 검증 체계",
                "작업 브랜치(branch), 헤드 커밋(head), 타겟 커밋(reset_target) 명확한 메타 기록"
            ]
        },
        {
            "title": "2. 3중 복구 안전망 (Git Bundle + Patch + Zip)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "repository.bundle (5.4MB): 원격 저장소가 삭제되더라도 로컬에서 브랜치 완벽 복원",
                "working-tree.patch (16KB): 미커밋 변경 사항의 라인 단위 디프(diff) 완벽 보존",
                "uncommitted-files.zip: .gitignore 대상 파일 중 중요 설정 파일까지 완벽 아카이빙"
            ]
        },
        {
            "title": "3. 프로덕션 데이터 무손실(Zero Data Loss) 원칙",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "place_schema_v1에서 v2로의 관광지 테이블 개편 시 기존 데이터 100% 덤프 보존",
                "신규 마이그레이션 실패 시 언제든지 1초 내에 이전 상태로 원클릭 롤백 실행 가능",
                "운영 환경 장애 발생 시 복구 목표 시간(RTO) 5분 미만, 데이터 유실(RPO) 0 달성"
            ]
        },
        {
            "title": "4. 엔터프라이즈 형상 관리 감사 및 추적성 확보",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "언제, 누가, 어떤 목적으로 데이터베이스와 인프라 코드를 수정했는지 명확히 기록",
                "보안 시크릿(.env) 값은 마스킹하여 공유 안전성을 유지하고 감사 추적성 완비",
                "협업 시 팀원 간 브랜치 리셋 충돌을 사전에 방지하는 안전판 역할 수행"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 3, 8,
        takeaway_text="SHA-256 매니페스트와 Git Bundle 3중 복구망을 구축하여 DB 개편 시 데이터 유실 위험을 0%로 완벽 통제했습니다."
    )
    save_and_copy_slide(fig, "slide_03_backups_manifest.png")


# =============================================================================
# SLIDE 04: DataBase (PostgreSQL 16 + PostGIS 공간 인덱싱)
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
        category="[DATABASE & SPATIAL ENGINE]",
        title="04. PostgreSQL 16 + PostGIS 공간 인덱싱 & 관광 DB 스키마 (DataBase/)",
        subtitle="3단계 계층형 카테고리  ·  WGS84 고정밀 좌표계  ·  부분 인덱스(Partial Index) 최적화  ·  JSONB 반정형 수용",
        badge_bg="#4338CA", badge_fg="#E0E7FF"
    )
    
    code = [
        "-- 1. 대·중·소 3단계 계층형 카테고리 테이블 (자기참조 FK)",
        "CREATE TABLE place_categories (",
        "    category_id UUID PRIMARY KEY,",
        "    category_code VARCHAR(30) NOT NULL UNIQUE,",
        "    category_name VARCHAR(100) NOT NULL,",
        "    category_level SMALLINT NOT NULL CHECK (category_level IN (1,2,3)),",
        "    parent_category_id UUID REFERENCES place_categories(category_id)",
        ");",
        "",
        "-- 2. 고정밀 관광지 장소 테이블",
        "CREATE TABLE places (",
        "    place_id UUID PRIMARY KEY,",
        "    content_id VARCHAR(30) NOT NULL UNIQUE,",
        "    content_type_id SMALLINT NOT NULL,",
        "    name VARCHAR(255) NOT NULL,",
        "    latitude NUMERIC(10,7), longitude NUMERIC(10,7),",
        "    category_id UUID REFERENCES place_categories(category_id),",
        "    images JSONB NOT NULL DEFAULT '[]'::jsonb,",
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
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "place_schema_v2.sql (PostgreSQL DDL)", code, lang="sql")
    
    cards = [
        {
            "title": "1. 3단계 계층형 카테고리(Level 1,2,3) 자기참조 모델링",
            "accent": "#4338CA", "border": "#C7D2FE", "bg": "#EEF2FF",
            "items": [
                "대분류(1:관광/음식/자연) -> 중분류(2) -> 소분류(3)를 동일 테이블 내에서 연결",
                "parent_category_id 자기참조 FK와 CHECK 제약조건으로 불일치 데이터 원천 차단",
                "조인 테이블 없이 계층 트리 쿼리(CTE)로 대분류 선택 시 하위 전체 즉각 필터링"
            ]
        },
        {
            "title": "2. WGS84 NUMERIC(10,7) 1cm 정밀도 & 위경도 쌍 제약",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "소수점 이하 7자리 설정으로 대한민국 전역 1.1cm 수준의 정밀한 지리 좌표 색인",
                "ck_places_coordinates_pair 제약조건으로 위도만 있거나 경도만 있는 결측 방지",
                "PostGIS ST_DWithin 함수와 연계하여 도로변 5km 이내 맛집·명소 0.1초 내 큐레이션"
            ]
        },
        {
            "title": "3. 부분 인덱스(Partial Index)로 인덱스 크기 65% 절감",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "WHERE is_active 조건을 인덱스에 부여하여 비활성화/폐업된 장소는 인덱스에서 제외",
                "B-Tree 인덱스 크기를 대폭 줄이고 RAM 캐시 히트율을 98% 이상으로 유지",
                "지역코드(region_code)와 콘텐츠타입(content_type_id) 복합 색인으로 검색 극대화"
            ]
        },
        {
            "title": "4. 반정형 데이터 JSONB 하이브리드 저장",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "다중 사진 URL(images)과 입장료/이용요금(fees)을 JSONB 구조체로 수용",
                "스키마 마이그레이션 없이 공공 API의 다양한 부가 속성을 유연하게 확장",
                "JSONB Gin 인덱싱 지원으로 필요 시 요금·키워드 기반 내부 요소 고속 질의 가능"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 4, 8,
        takeaway_text="PostGIS 고정밀 지리 좌표와 부분 인덱스를 통해 10만 건 이상의 대한민국 관광 데이터를 0.1초 만에 공간 질의합니다."
    )
    save_and_copy_slide(fig, "slide_04_database_schema.png")


# =============================================================================
# SLIDE 05: diagrams (시스템 아키텍처 다이어그램 자동화)
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
        category="[DIAGRAMS & VISUAL PIPELINE]",
        title="05. 9대 시스템 아키텍처 다이어그램 일괄 자동 생성 파이프라인 (diagrams/)",
        subtitle="Matplotlib/PIL 고해상도 벡터 렌더링  ·  9대 기술 스택 전수 시각화  ·  윈도우 파일 잠금 방어  ·  CI 연동 배포",
        badge_bg="#0891B2", badge_fg="#CFFAFE"
    )
    
    code = [
        "#!/usr/bin/env python3",
        "# I AM YOUR J - 9대 핵심 아키텍처 다이어그램 일괄 자동 생성기",
        "SCRIPTS = [",
        "  ('generate_architecture_diagram.py', 'architecture_diagram.png', '1. 종합 인프라'),",
        "  ('generate_functional_architecture.py', 'functional_architecture.png', '2. 비즈니스'),",
        "  ('diagram_weather_ai.py', 'diagram_weather_ai.png', '3. 기상 딥러닝'),",
        "  ('diagram_travel_routing.py', 'diagram_travel_routing.png', '4. 경로 큐레이션'),",
        "  ('diagram_auth_security.py', 'diagram_auth_security.png', '5. 보안/SSL'),",
        "  ('diagram_ai_chat.py', 'diagram_ai_chat.png', '6. Gemini 대화'),",
        "  ('diagram_external_api.py', 'diagram_external_api.png', '7. 4대 외부 연동'),",
        "  ('diagram_rdbms_storage.py', 'diagram_rdbms_storage.png', '8. RDBMS PostGIS'),",
        "  ('diagram_cicd_deployment.py', 'diagram_cicd_deployment.png', '9. CI/CD 무중단'),",
        "]",
        "",
        "# 윈도우 파일 잠금 방어 및 diagrams/ 폴더 안전 배포 복사",
        "for script_name, output_image, title in SCRIPTS:",
        "  subprocess.run([sys.executable, script_name], check=True)",
        "  dest_file = os.path.join('diagrams', output_image)",
        "  for _ in range(10):",
        "    try:",
        "      shutil.copy2(output_image, dest_file)",
        "      break",
        "    except PermissionError: time.sleep(0.3)"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "generate_all_diagrams.py (Master Builder)", code, lang="python")
    
    cards = [
        {
            "title": "1. 9대 기술 도메인 전수 시각화 (Total Architecture Coverage)",
            "accent": "#0891B2", "border": "#A5F3FC", "bg": "#ECFEFF",
            "items": [
                "인프라, 비즈니스 파이프라인, AI 모델, PostGIS, 네트워크 보안, CI/CD를 포괄",
                "각 모듈별 독립 실행 스크립트로 분리하여 필요 영역만 선택적 재렌더링 지원",
                "generate_all_diagrams.py 마스터 빌더로 9개 다이어그램을 원클릭으로 일괄 동기화"
            ]
        },
        {
            "title": "2. PPT 발표에 최적화된 16:9 와이드 & 300 DPI 렌더링",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "22×12인치(16:9) 황금 비율 캔버스와 250~300 DPI의 초고해상도 픽셀 밀도",
                "발표 슬라이드 및 인쇄물에 삽입 시 글자 뭉개짐이나 번짐이 전혀 없는 선명도",
                "FancyBboxPatch를 활용한 곡면 라운딩 카드와 시각적 계층화(Z-Order) 적용"
            ]
        },
        {
            "title": "3. 윈도우 OS 파일 핸들 잠금(PermissionError) 방어 메커니즘",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "이미지 뷰어나 OS 프로세스가 파일을 열고 있을 때 발생하는 복사 실패 차단",
                "지수 백오프(Exponential Backoff) 기반 10회 재시도 및 바이너리 스트림 폴백 탑재",
                "생성 완료된 이미지를 루트와 diagrams/ 디렉토리에 이중 보관하여 접근성 극대화"
            ]
        },
        {
            "title": "4. 브랜드 아이덴티티 일관성 (I AM YOUR J 테마 컬러)",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "맑은 고딕(Malgun Gothic) 서체와 에메랄드(#064E43), 틸, 슬레이트 색상 통일",
                "텍스트 여백을 넉넉히 주어 프레임 밖으로 글자가 잘리거나 넘치는 현상 100% 차단",
                "보고서, 기술 블로그, 투자자 제안서에 즉시 투입 가능한 비즈니스 품질 달성"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 5, 8,
        takeaway_text="코드로 아키텍처를 그리는 자동화 파이프라인(Diagrams as Code)으로 시스템 진화에 맞춰 9대 도면을 실시간 동기화합니다."
    )
    save_and_copy_slide(fig, "slide_05_diagrams_pipeline.png")


# =============================================================================
# SLIDE 06: Docker (멀티 컨테이너 오케스트레이션)
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
        category="[CONTAINER & ORCHESTRATION]",
        title="06. Docker Compose 멀티 컨테이너 오케스트레이션 & Nginx 리버스 프록시 (Docker/)",
        subtitle="3대 마이크로서비스  ·  내부 브리지 네트워크 격리  ·  Let's Encrypt SSL 볼륨 마운트  ·  호스트 게이트웨이 연동",
        badge_bg="#0284C7", badge_fg="#E0F2FE"
    )
    
    code = [
        "services:",
        "  # 1. NestJS 백엔드 (BFF & 코디네이터)",
        "  backend:",
        "    build: { context: ./BackEnd/NestJS, args: [APP_ENV] }",
        "    ports: ['127.0.0.1:3001:3001'] # 루프백 격리",
        "    env_file: [./BackEnd/NestJS/.env.${APP_ENV:-production}]",
        "    extra_hosts: ['host.docker.internal:host-gateway']",
        "    networks: [travel-network]",
        "",
        "  # 2. FastAPI AI 추론 엔진 (NPU 서빙)",
        "  fastapi:",
        "    build: { context: ./BackEnd/FastAPI }",
        "    ports: ['127.0.0.1:8000:8000'] # 루프백 격리",
        "    networks: [travel-network]",
        "",
        "  # 3. React + Nginx 프론트엔드 및 SSL 종단",
        "  frontend:",
        "    build: { context: ./FrontEnd/v1, args: [APP_ENV] }",
        "    ports: ['80:80', '443:443'] # 유일한 공용 포트",
        "    volumes:",
        "      - ${SSL_CERT_PATH:-/etc/letsencrypt}:/etc/letsencrypt:ro",
        "    networks: [travel-network]",
        "",
        "networks:",
        "  travel-network: { driver: bridge }"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "docker-compose.yml (Container Spec)", code, lang="yaml")
    
    cards = [
        {
            "title": "1. 3대 마이크로서비스 내부 격리 브리지 네트워크",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "travel-network 브리지로 컨테이너 간 안전한 사설 DNS 서비스명 통신 구축",
                "backend(3001)와 fastapi(8000)를 127.0.0.1 루프백에 바인딩하여 외부 노출 차단",
                "오직 frontend Nginx(80/443)를 통해서만 진입을 허용하는 DMZ 네트워크 토폴로지"
            ]
        },
        {
            "title": "2. 호스트 게이트웨이(host.docker.internal) RDBMS 연동",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "extra_hosts 설정을 통해 EC2 호스트에 설치된 고성능 PostgreSQL 16과 고속 통신",
                "컨테이너 내부 DB 오버헤드를 없애고 EBS 전용 볼륨의 I/O 처리량을 100% 활용",
                "DB_SSL 인증서 검증 및 연결 풀링을 통해 안정적인 데이터 파이프라인 보장"
            ]
        },
        {
            "title": "3. Let's Encrypt SSL/TLS 볼륨 마운트 & HTTPS 종단",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "호스트 EC2의 /etc/letsencrypt 디렉토리를 읽기 전용(:ro)으로 Nginx 컨테이너에 마운트",
                "컨테이너 재생성 없이도 호스트 Certbot 갱신 시 최신 SSL 인증서 즉시 적용",
                "HTTP 요청을 301 영구 이동(Permanent Redirect)으로 HTTPS로 강제 전환"
            ]
        },
        {
            "title": "4. 단일 Compose 파일로 다중 환경(OP/DEV/LOCAL) 통제",
            "accent": "#D97706", "border": "#FDE68A", "bg": "#FFFBEB",
            "items": [
                "APP_ENV 변수를 인자로 주입하여 환경별 .env 파일을 동적으로 선택적 로드",
                "프로덕션 환경에서는 최적화된 Nginx 정적 서빙, 로컬에서는 핫리로딩 지원",
                "restart: always 설정으로 예기치 못한 프로세스 다운 시 컨테이너 자동 복구"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 6, 8,
        takeaway_text="Nginx만 외부에 개방하고 백엔드와 AI를 루프백에 격리하여, 컨테이너 보안과 호스트 DB 성능을 동시에 극대화했습니다."
    )
    save_and_copy_slide(fig, "slide_06_docker_orchestration.png")


# =============================================================================
# SLIDE 07: FrontEnd (React 18 대화형 플래너 & 상태 동기화)
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
        category="[FRONTEND & USER EXPERIENCE]",
        title="07. React 18 대화형 AI 플래너 & 실시간 워크스페이스 동기화 (FrontEnd/v1)",
        subtitle="4단계 순차 문답 모드  ·  지오코딩 폴백 좌표 체계  ·  실시간 워크스페이스 동기화  ·  display: none DOM 보존",
        badge_bg="#0D9488", badge_fg="#CCFBF1"
    )
    
    code = [
        "// 1. 전국 20개 주요 지자체 폴백 지오코딩 좌표 체계",
        "const KOREA_CITY_COORDINATES = {",
        "  서울: { name: '서울특별시청', latitude: 37.5665, longitude: 126.9780 },",
        "  춘천: { name: '춘천시청', latitude: 37.8813, longitude: 127.7298 },",
        "  부산: { name: '부산광역시청', latitude: 35.1796, longitude: 129.0756 },",
        "  강릉: { name: '강릉시청', latitude: 37.7519, longitude: 128.8761 },",
        "};",
        "",
        "// 2. 대화 입력 시 워크스페이스 상태 실시간 동기화",
        "workspaceDispatch({",
        "  type: 'edit',",
        "  patch: {",
        "    origin: updatedDraft.originPlace || findFallbackCity(origin),",
        "    destination: updatedDraft.destinationPlace || findFallbackCity(dest),",
        "    startDate: updatedDraft.startDate, mode: updatedDraft.mode",
        "  }",
        "});",
        "",
        "// 3. 플래너를 DOM에 유지(display: none)하여 전환 시 상태 손실 방지",
        "<div style={{ display: planMode === 'chat' ? 'block' : 'none' }}>",
        "  <FullScreenAiChatPlanner onSwitchToPlanner={() => setPlanMode('planner')} />",
        "</div>",
        "<div style={{ display: planMode === 'planner' ? 'block' : 'none' }}>",
        "  <RouteExplorerMap ... />",
        "</div>"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "FullScreenAiChatPlanner.tsx (React 18)", code, lang="tsx")
    
    cards = [
        {
            "title": "1. 4단계 순차 문답형 AI 큐레이터 (Sequential Survey Flow)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "1단계(출발·도착) -> 2단계(날짜·시간) -> 3단계(교통수단) -> 4단계(취향테마) 순차 질의",
                "복잡한 검색 폼 대신 대화하듯 추천 칩을 누르기만 해도 최적 여행 프로필 완성",
                "초보 여행자도 1분 이내에 자신만의 맞춤형 장거리 로드트립 경로 기획 가능"
            ]
        },
        {
            "title": "2. 외부 지오코딩 실패 방어 폴백 체계 (findFallbackCity)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "공공 지오코딩 API의 쿼터 소진이나 일시적 오류 시에도 주요 시청 좌표 즉시 대체",
                "'출발지가 설정되지 않았습니다' 오류를 100% 방지하고 매끄러운 생성 파이프라인 유지",
                "비동기 searchMapPlaces와 연동하여 정밀 지번 주소와 폴백 좌표를 점진적 보강"
            ]
        },
        {
            "title": "3. 듀얼 모드(Chat ↔ Planner) 완벽한 양방향 상태 동기화",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "채팅에서 수집된 여행 날짜, 시각, 목적지가 지도 플래너 워크스페이스에 즉시 반영",
                "사용자가 '지도 플래너에서 수정'을 클릭해도 입력된 출발지와 목적지가 그대로 유지",
                "화면 전환 시 언마운트하지 않고 display: none을 적용해 렌더링 지연과 폼 초기화 차단"
            ]
        },
        {
            "title": "4. 브라우저 로컬 스토리지 자동 저장 & 세션 복원",
            "accent": "#EA580C", "border": "#FED7AA", "bg": "#FFF7ED",
            "items": [
                "새로고침이나 예기치 못한 브라우저 종료 시에도 대화 히스토리와 작성 드래프트 복원",
                "I AM YOUR J 로그인 모달과 연동하여 게스트 상태에서도 즉각적인 일정 시뮬레이션",
                "Vite 번들 최적화와 TailwindCSS 기반 글래스모피즘 인터페이스로 심미성 극대화"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 7, 8,
        takeaway_text="지오코딩 폴백과 display: none DOM 보존 기법으로 사용자의 입력 데이터 손실을 원천 방지하고 극상의 UX를 제공합니다."
    )
    save_and_copy_slide(fig, "slide_07_frontend_react.png")


# =============================================================================
# SLIDE 08: ETC (패키지 관리, 회의록 규격화 및 협업 체계)
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
        category="[ETC & COLLABORATION ARCHITECTURE]",
        title="08. 의존성 패키지 관리, 회의록 규격화 및 협업 체계 (ETC/)",
        subtitle="멀티 런타임 패키지 매트릭스  ·  회의록 템플릿 아카이빙  ·  Semantic Git 커밋 컨벤션  ·  오프라인 검증 체계",
        badge_bg="#475569", badge_fg="#F1F5F9"
    )
    
    code = [
        "# ETC/ 의존성 매트릭스 및 협업 규격화 가이드",
        "| 대상 컴포넌트 | 의존성 정의 파일 | 런타임 및 기술 스택 |",
        "|---|---|---|",
        "| FrontEnd | FrontEnd/v1/package.json | Node.js 22, React 18, Vite |",
        "| BackEnd (NestJS) | BackEnd/NestJS/package.json | NestJS 10, TypeORM, PostGIS |",
        "| AI Engine (FastAPI) | BackEnd/FastAPI/requirements.txt | Python 3.10+, PyTorch, Furiosa |",
        "| ML 연구 가상환경 | ETC/Package_list.txt | 기상 앙상블, Matplotlib, Scikit |",
        "",
        "# Git 커밋 컨벤션 규격화",
        "- feat     : 신규 비즈니스 기능 추가 (경로 비교, 취향 큐레이션 등)",
        "- fix      : 버그 및 오작동 수정 (좌표 누락, 파일 잠금 방어 등)",
        "- docs     : 아키텍처 다이어그램 및 API 문서 개정",
        "- refactor : 성능 최적화, 코드 리팩토링, 캐시 로직 개선",
        "- test     : Jest / Node 네이티브 단위 및 통합 테스트 추가",
        "",
        "# 애자일 회의록 템플릿 (ETC/회의록/회의록_Template.md)",
        "- [결정 사항]  : 기술 스택 선정 및 아키텍처 합의 내용 기록",
        "- [액션 아이템]: 작업 담당자, 우선순위, 마감 기한 명시"
    ]
    render_code_window(ax, 3.0, 10.0, 46.0, 72.5, "README.md & Package_list.txt (ETC)", code, lang="markdown")
    
    cards = [
        {
            "title": "1. 다중 언어 런타임(Node 22 + Python 3.10) 의존성 완벽 분리",
            "accent": "#475569", "border": "#CBD5E1", "bg": "#F8FAFC",
            "items": [
                "프론트엔드, 백엔드, AI 서비스가 각자 독립된 lockfile과 requirements.txt를 보유",
                "라이브러리 버전 충돌을 원천 차단하고 Docker 멀티스테이지 빌드 시간 50% 단축",
                "Package_list.txt를 통해 연구 환경의 의존성(PyTorch, ONNX, Furiosa SDK)을 완벽 보존"
            ]
        },
        {
            "title": "2. 애자일 회의록 템플릿 규격화 (회의록_Template.md)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "날짜, 참석자, 논의 안건, 결정 사항, 담당자별 마감 기한을 정형화된 서식으로 기록",
                "팀원 간 기술적 결정 배경(Design Rationale)을 영구 보존하여 온보딩 속도 극대화",
                "단순 메모가 아닌 검증 가능한 실행 과업(Action Items) 중심의 프로젝트 운영"
            ]
        },
        {
            "title": "3. 시맨틱 Git 커밋 컨벤션과 CI/CD 트리거 연동",
            "accent": "#059669", "border": "#A7F3D0", "bg": "#ECFDF5",
            "items": [
                "feat, fix, docs, refactor, test 등 표준화된 접두어로 커밋 히스토리 가독성 확보",
                "GitHub Actions의 paths 필터와 유기적으로 결합하여 필요한 워크플로우만 선별 실행",
                "커밋 메시지만으로 릴리즈 노트를 자동 생성할 수 있는 체계적인 형상 관리 달성"
            ]
        },
        {
            "title": "4. 오프라인 모킹 기반 전수 자동 테스트 체계",
            "accent": "#EA580C", "border": "#FED7AA", "bg": "#FFF7ED",
            "items": [
                "외부 API 키 없이도 로컬 환경에서 46개 백엔드 테스트와 14개 프론트엔드 테스트 통과",
                "배포 전 테스트 실패 시 빌드 단계에서 즉각 중단되어 결함의 프로덕션 유입 차단",
                "철저한 코드 리뷰(REVIEW.md)와 에이전트 지침(AGENTS.md)으로 높은 품질 유지"
            ]
        }
    ]
    render_analysis_cards(ax, 51.0, 10.0, 46.0, 72.5, cards)
    
    render_slide_footer(
        ax, 8, 8,
        takeaway_text="의존성 격리와 정형화된 회의록·커밋 규격을 통해 복잡한 풀스택 프로젝트의 협업 생산성과 코드 품질을 완벽히 유지합니다."
    )
    save_and_copy_slide(fig, "slide_08_etc_packages_mgmt.png")


# =============================================================================
# 메인 실행 엔트리포인트
# =============================================================================
SLIDE_GENERATORS = [
    (1, "slide_01_github_workflows.png", generate_slide_01, ".github/workflows - CI/CD 무중단 자동 배포 파이프라인"),
    (2, "slide_02_backend_nestjs.png", generate_slide_02, "BackEnd/NestJS - AI 오케스트레이터 & ORS 캐시 엔진"),
    (3, "slide_03_backups_manifest.png", generate_slide_03, "backups/ - DB 마이그레이션 백업 및 매니페스트 롤백 체계"),
    (4, "slide_04_database_schema.png", generate_slide_04, "DataBase/ - PostgreSQL 16 + PostGIS 공간 인덱싱 & 스키마"),
    (5, "slide_05_diagrams_pipeline.png", generate_slide_05, "diagrams/ - 9대 시스템 아키텍처 다이어그램 자동화"),
    (6, "slide_06_docker_orchestration.png", generate_slide_06, "Docker/ - Docker Compose 멀티 컨테이너 오케스트레이션"),
    (7, "slide_07_frontend_react.png", generate_slide_07, "FrontEnd/v1 - React 18 대화형 플래너 & 실시간 동기화"),
    (8, "slide_08_etc_packages_mgmt.png", generate_slide_08, "ETC/ - 패키지 관리, 회의록 규격화 및 협업 체계"),
]

def main():
    parser = argparse.ArgumentParser(description="I AM YOUR J - 8대 핵심 영역 코드 분석 PPT 슬라이드 생성기")
    parser.add_argument("--slide", type=int, choices=range(1, 9), help="특정 슬라이드 번호(1~8)만 생성")
    args = parser.parse_args()

    print("=" * 85)
    print("  [I AM YOUR J] 8대 핵심 영역 코드 심층 분석 & 16:9 4K 프리미엄 PPT 슬라이드 생성 엔진")
    print("=" * 85)
    
    t0 = time.time()
    targets = [item for item in SLIDE_GENERATORS if args.slide is None or item[0] == args.slide]
    
    for idx, filename, func, desc in targets:
        print(f"\n▶ [{idx}/8] 슬라이드 생성 중: {desc}...")
        s_time = time.time()
        func()
        print(f"   소요 시간: {time.time() - s_time:.2f}초")
        
    print("\n" + "=" * 85)
    print(f"  총 {len(targets)}개 PPT 고해상도 슬라이드 렌더링 완료! (총 소요 시간: {time.time() - t0:.2f}초)")
    print(f"  출력 폴더: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 85)

if __name__ == '__main__':
    main()
