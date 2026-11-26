# -*- coding: utf-8 -*-
"""
create_slide_graphics.py
Slide 7 및 Slide 15의 본문 영역(Header 라인 아래 전체)에 딱 맞게 배치되는
초고해상도 다크 IDE + 전문 아키텍처 분석 카드 그래픽 렌더러
"""

import os
import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

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

def render_code_window(ax, x, y, w, h, filename, code_lines, lang="code"):
    draw_rounded_box(ax, x, y, w, h, "#0F172A", "#334155", border_width=2.2, radius=1.0, zorder=3)
    
    header_h = 4.2
    draw_rounded_box(ax, x, y + h - header_h, w, header_h, "#1E293B", "#334155", border_width=1.0, radius=0.8, zorder=4)
    
    # 윈도우 버튼
    circle_y = y + h - header_h / 2.0
    for idx, c in enumerate(["#EF4444", "#F59E0B", "#10B981"]):
        circ = patches.Circle((x + 1.8 + idx * 1.5, circle_y), 0.55, facecolor=c, edgecolor='none', zorder=5)
        ax.add_patch(circ)
        
    ax.text(x + w / 2.0, circle_y, f"FILE: {filename}", color='#F8FAFC', fontsize=12.0, fontfamily='Malgun Gothic', fontweight='bold', ha='center', va='center', zorder=5)
    ax.text(x + w - 2.0, circle_y, lang.upper(), color='#94A3B8', fontsize=11.0, fontfamily='Consolas', ha='right', va='center', zorder=5)
    
    n_lines = len(code_lines)
    avail_h = h - header_h - 2.8
    line_step = min(3.1, avail_h / max(n_lines, 1))
    code_font_size = 11.2 if n_lines > 23 else 11.8
    
    code_start_y = y + h - header_h - 2.2
    for i, line in enumerate(code_lines):
        line_y = code_start_y - i * line_step
        if line_y < y + 1.0:
            break
        ax.text(x + 1.6, line_y, f"{i+1:2d}", color='#475569', fontsize=code_font_size - 0.5, fontfamily='Consolas', va='center', zorder=5)
        ax.plot([x + 3.8, x + 3.8], [line_y - line_step * 0.45, line_y + line_step * 0.45], color='#334155', lw=0.8, zorder=4)
        
        stripped = line.strip()
        color = '#F8FAFC'
        if stripped.startswith('#') or stripped.startswith('//'):
            color = '#94A3B8'
        elif any(k in line for k in ['name:', 'runs-on:', 'steps:', 'uses:', 'with:', 'run:', 'concurrency:', 'branches:', 'group:']):
            color = '#38BDF8'
        elif any(k in line for k in ['function', 'export', 'const', 'return', 'async', 'await', 'try', 'finally']):
            color = '#F43F5E'
        elif any(k in line for k in ['canonicalJson', 'requestHash', 'createHash', 'digest', 'update', 'pending', 'load']):
            color = '#FBBF24'
        elif any(k in line for k in ['true', 'false', 'null', 'undefined']):
            color = '#A78BFA'
        elif "'" in line or '"' in line:
            color = '#34D399'
            
        has_korean = any((0xAC00 <= ord(char) <= 0xD7A3) or (0x1100 <= ord(char) <= 0x11FF) or (0x3130 <= ord(char) <= 0x318F) for char in line)
        font_to_use = 'Malgun Gothic' if has_korean else 'Consolas'
        ax.text(x + 4.6, line_y, line, color=color, fontsize=code_font_size, fontfamily=font_to_use, va='center', zorder=5)

def render_analysis_cards(ax, x, y, w, h, cards):
    n_cards = len(cards)
    gap = 1.6
    card_h = (h - (n_cards - 1) * gap) / n_cards
    
    for i, c in enumerate(cards):
        cy = y + h - (i + 1) * card_h - i * gap
        draw_rounded_box(ax, x, cy, w, card_h, c.get("bg", "#F8FAFC"), c.get("border", "#CBD5E1"), border_width=1.8, radius=0.8, zorder=3)
        draw_rounded_box(ax, x, cy, 1.3, card_h, c.get("accent", "#0284C7"), c.get("accent", "#0284C7"), radius=0.4, zorder=4)
        
        ax.text(x + 2.8, cy + card_h - 2.8, c["title"], color='#0F172A', fontsize=15.2, fontweight='bold', va='center', zorder=4)
        
        item_y = cy + card_h - 6.2
        item_step = 3.6
        for item in c["items"]:
            ax.plot([x + 3.2], [item_y], marker='o', markersize=4.8, color=c.get("accent", "#0284C7"), zorder=4)
            ax.text(x + 4.6, item_y, item, color='#0F172A', fontsize=12.8, fontweight='bold', va='center', zorder=4)
            item_y -= item_step

def render_footer_bar(ax, x, y, w, h, key_label, takeaway_text):
    draw_rounded_box(ax, x, y, w, h, "#0F172A", "#1E293B", border_width=1.2, radius=0.8, zorder=3)
    ax.text(x + 1.8, y + h / 2.0, key_label, color='#FCD34D', fontsize=13.0, fontweight='bold', va='center', zorder=4)
    ax.text(x + 20.0, y + h / 2.0, takeaway_text, color='#FFFFFF', fontsize=12.8, fontweight='bold', va='center', zorder=4)

def generate_slide_07_body():
    # 2.14:1 비율 (22 x 10.25 inches)
    fig = plt.figure(figsize=(24, 11.2), dpi=220, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    code = [
        "// 1. 요청 파라미터 재귀 정렬 및 SHA-256 고유 해시 키 생성",
        "export function canonicalJson(value: unknown): string {",
        "  if (Array.isArray(value))",
        "    return '[' + value.map(canonicalJson).join(',') + ']';",
        "  if (value !== null && typeof value === 'object') {",
        "    const sorted = Object.entries(value).sort(([a], [b]) => a < b ? -1 : 1);",
        "    return '{' + sorted.map(([k, v]) =>",
        "      JSON.stringify(k) + ':' + canonicalJson(v)",
        "    ).join(',') + '}';",
        "  }",
        "  return JSON.stringify(value);",
        "}",
        "export function requestHash(provider: string, req: unknown): string {",
        "  const payload = provider + ':' + canonicalJson(req);",
        "  return createHash('sha256').update(payload).digest('hex');",
        "}",
        "// 2. Single-Flight 패턴: 캐시 스탬피드 원천 차단 (중복 요청 병합)",
        "async get(request: Q): Promise<CacheResult<T>> {",
        "  const hash = requestHash(this.name, request);",
        "  const existing = this.pending.get(hash);",
        "  if (existing) return existing; // 진행 중 Promise 공유",
        "  // 3. PostgreSQL 24h 캐시 조회 -> Miss 시 ORS 외부 API 호출",
        "  const task = this.load(hash, request);",
        "  this.pending.set(hash, task);",
        "  try { return await task; }",
        "  finally { this.pending.delete(hash); }",
        "}"
    ]
    render_code_window(ax, 0.5, 9.5, 48.5, 89.5, "cache-coordinator.ts & routing.service.ts", code, lang="typescript")
    
    cards = [
        {
            "title": "1. OpenRouteService 다중 프로필 라우팅 (Directions API)",
            "accent": "#0891B2", "border": "#A5F3FC", "bg": "#ECFEFF",
            "items": [
                "자차(driving-car) 및 도보(foot-walking) 전용 도로망 분리 라우팅 (대중교통 배제)",
                "추천(recommended) 및 최단(shortest) 대안 경로 비교 및 고해상도 지오메트리 추출"
            ]
        },
        {
            "title": "2. Canonical JSON 정규화 & SHA-256 24h 캐싱 (Cache Coordinator)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "파라미터 키 재귀 정렬(canonicalJson)로 동일 요청 64자리 고유 해시 키 생성",
                "PostgreSQL 24h 캐싱으로 동일 구간 재요청 시 10ms 초고속 응답 (API 85% 절감)"
            ]
        },
        {
            "title": "3. Single-Flight 동시성 제어 (Cache Stampede 방어)",
            "accent": "#E11D48", "border": "#FECDD3", "bg": "#FFF1F2",
            "items": [
                "인메모리 pending Map으로 동일 해시의 동시 다발 요청을 단일 프로미스 결합",
                "트래픽 급증 시에도 외부 ORS 호출을 단 1회로 제한하여 할당 쿼터 완벽 보호"
            ]
        },
        {
            "title": "4. PostGIS 5km 공간 버퍼 질의 & TourAPI 4.0 큐레이션",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "Equirectangular 평면 투영 및 도로 선분 중심 ST_DWithin 5km 이내 공간 질의",
                "한국관광공사 TourAPI 4.0 3단계 계층 카테고리 매핑 및 타임라인 자동 배치"
            ]
        }
    ]
    render_analysis_cards(ax, 50.0, 9.5, 49.5, 89.5, cards)
    
    render_footer_bar(
        ax, 0.5, 1.2, 99.0, 6.8,
        "[★ ROUTING CORE]",
        "Canonical JSON 정렬과 Single-Flight 패턴으로 외부 쿼터를 보호하고, 도로 선분 5km 수직거리 질의로 최적 명소를 큐레이션합니다."
    )
    
    out_path = "slide_07_body.png"
    fig.savefig(out_path, dpi=220, bbox_inches='tight', facecolor='#FFFFFF', pad_inches=0.08)
    plt.close(fig)
    print(f"Generated: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")

def generate_slide_15_body():
    fig = plt.figure(figsize=(24, 11.2), dpi=220, facecolor='#FFFFFF')
    ax = fig.add_subplot(111)
    ax.set_facecolor('#FFFFFF')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    
    code = [
        "name: Deploy to Production (AWS EC2)",
        "on:",
        "  push:",
        "    branches: [ main ]",
        "",
        "# 동시성 제어: 동일 배포 그룹 내 중복 빌드 경합 즉시 차단",
        "concurrency:",
        "  group: production-deployment",
        "  cancel-in-progress: true",
        "",
        "jobs:",
        "  build:  # 1. Cloud Runner 사전 격리 빌드",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - uses: actions/setup-node@v4",
        "        with: { node-version: '22', cache: 'npm' }",
        "      - run: npm ci && npm run build  # tsc 및 번들 무결성 검증",
        "      - uses: actions/upload-artifact@v4",
        "        with: { name: dist, path: FrontEnd/v1/dist/ }",
        "",
        "  deploy: # 2. Self-Hosted Runner 내부 안전 배포",
        "    needs: build",
        "    runs-on: [self-hosted, linux]",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "        with: { clean: false }  # .env 운영 환경변수 보존",
        "      - uses: actions/download-artifact@v4",
        "      - run: bash CI_CD/deploy.sh  # 핫스왑 교체 & 헬스체크"
    ]
    render_code_window(ax, 0.5, 9.5, 48.5, 89.5, "deploy.yml (GitHub Actions Pipeline)", code, lang="yaml")
    
    cards = [
        {
            "title": "1. Two-Stage 빌드·배포 분리 (Build Isolation)",
            "accent": "#0284C7", "border": "#BAE6FD", "bg": "#F0F9FF",
            "items": [
                "Cloud Runner(ubuntu-latest)에서 번들 빌드 및 tsc 사전 검증 -> EC2 부하 0%",
                "upload-artifact로 dist/ 산출물 생성 후 배포 잡으로 안전 인계"
            ]
        },
        {
            "title": "2. Self-Hosted 러너 보안 배포 & 설정 보존 (clean: false)",
            "accent": "#0D9488", "border": "#99F6E4", "bg": "#F0FDFA",
            "items": [
                "EC2 인스턴스 내부 러너 구동 -> 외부 인바운드 SSH 포트 미개방 최고 보안 배포",
                "clean: false 옵션으로 서버 내 사전 배치된 .env 환경변수 및 비밀값 보존"
            ]
        },
        {
            "title": "3. 동시성 제어 & 원자적 롤아웃 (Concurrency & Zero-Downtime)",
            "accent": "#E11D48", "border": "#FECDD3", "bg": "#FFF1F2",
            "items": [
                "group: production, cancel-in-progress: true로 배포 경합 및 낭비 차단",
                "backups/ 압축 백업 후 docker compose up -d --no-deps & Nginx reload 다운타임 0초"
            ]
        },
        {
            "title": "4. 다단계 헬스체크, 즉각 피드백 & 불사조 자가 치유",
            "accent": "#7C3AED", "border": "#DDD6FE", "bg": "#F5F3FF",
            "items": [
                "CI 실패 시 즉시 exit 1 중단 및 GitHub PR Red X / 메일·앱 실시간 푸시 알림",
                "배포 후 /api/health 5회 재시도 검증, 실패 시 docker logs 자동 출력 및 롤백",
                "Docker restart: always 데몬 정책으로 컨테이너 크래시 시 3초 내 자동 회복"
            ]
        }
    ]
    render_analysis_cards(ax, 50.0, 9.5, 49.5, 89.5, cards)
    
    render_footer_bar(
        ax, 0.5, 1.2, 99.0, 6.8,
        "[★ CI/CD CORE]",
        "Two-Stage 빌드 분리와 SSH 미개방 러너로 보안을 극대화하고, 원자적 핫스왑 및 다단계 헬스체크 루프로 무중단 운영을 실현합니다."
    )
    
    out_path = "slide_15_body.png"
    fig.savefig(out_path, dpi=220, bbox_inches='tight', facecolor='#FFFFFF', pad_inches=0.08)
    plt.close(fig)
    print(f"Generated: {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")

if __name__ == "__main__":
    generate_slide_07_body()
    generate_slide_15_body()
