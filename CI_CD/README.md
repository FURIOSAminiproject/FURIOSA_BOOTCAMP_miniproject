# CI/CD 및 HTTPS 배포 가이드

본 프로젝트는 **dev(개발)** 및 **op(운영)** 환경에서 HTTP 요청을 차단하고 **무조건 HTTPS 통신을 강제**합니다. (단, AWS EC2 PostgreSQL DB 통신은 내부 TCP 5432 연결 유지)

---

## 1. 전체 아키텍처 및 통신 구조

```
[ 브라우저 / 클라이언트 ]
         │ (무조건 HTTPS 강제 접속, HTTP 인입 시 301 리다이렉트)
         ▼
[ EC2 Nginx 웹 서버 (Port 443 SSL) ]
   ├── 정적 프론트엔드 파일 서빙 (/usr/share/nginx/html)
   └── /api/ 요청 리버스 프록시 (X-Forwarded-Proto: https 전달)
         ▼
[ PM2 프로세스 매니저 ]
         ▼
[ NestJS 백엔드 (Port 3001) ] (경로: /var/www/backend)
   └── HSTS 보안 헤더 강제 적용 및 비보안 요청 차단
         ▼ (TCP 5432 일반 연결)
[ PostgreSQL DB (32.236.200.229:5432) ]
```

---

## 2. EC2 서버 최초 준비 작업

### 2-1. Nginx HTTPS 설정
1. **설정 파일 복사**:
   저장소의 `CI_CD/nginx_https.conf`를 EC2의 `/etc/nginx/conf.d/travel.conf`로 복사합니다.
   ```bash
   sudo cp CI_CD/nginx_https.conf /etc/nginx/conf.d/travel.conf
   ```

2. **도메인 및 SSL 인증서 발급 (Certbot 추천)**:
   ```bash
   sudo apt update
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Nginx 설정 검증 및 반영**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 2-2. 백엔드 실행을 위한 PM2 전역 설치
Node.js 프로세스를 무중단 백그라운드로 실행하기 위해 PM2를 설치합니다.
```bash
sudo npm install -g pm2
```

---

## 3. GitHub Actions 자동 배포 파이프라인

프론트엔드와 백엔드가 각각 독립된 워크플로우로 자동 배포됩니다.

### 3-1. 프론트엔드 파이프라인 (`.github/workflows/deploy.yml`)
* **트리거**: `FrontEnd/**` 또는 `CI_CD/**` 변경 시 `main` 브랜치 푸시
* **빌드 잡 (Build)**: GitHub-hosted 러너에서 `CI_CD/build_frontend.sh` 실행 (`dist/` 생성)
* **배포 잡 (Deploy)**: EC2 Self-hosted 러너에서 `CI_CD/deploy_frontend.sh` 실행 (`/usr/share/nginx/html` 동기화)

### 3-2. 백엔드 파이프라인 (`.github/workflows/deploy_backend.yml`)
* **트리거**: `BackEnd/**` 또는 `CI_CD/**` 변경 시 `main` 브랜치 푸시
* **빌드 잡 (Build)**: GitHub-hosted 러너에서 `CI_CD/build_backend.sh` 실행
  - `npm ci`
  - `npm test` (API & DB 연결 격리 테스트 자동 검증)
  - `npm run build:prod` (`dist/` 컴파일)
* **배포 잡 (Deploy)**: EC2 Self-hosted 러너에서 `CI_CD/deploy_backend.sh` 실행
  - `/var/www/backend` 디렉토리로 산출물 배포
  - 프로덕션 의존성 설치 (`npm ci --omit=dev`)
  - PM2 프로세스 무중단 재기동 (`pm2 reload ecosystem.config.cjs`)
  - 헬스체크 검증 (`GET /api/health`)

---

## 4. EC2 백엔드 유용한 관리 명령어

```bash
# PM2 프로세스 상태 확인
pm2 status

# 백엔드 실시간 로그 확인
pm2 logs travel-backend

# 백엔드 수동 재기동
pm2 restart travel-backend

# 서버 재부팅 시 PM2 자동 시작 등록
pm2 startup
pm2 save
```
