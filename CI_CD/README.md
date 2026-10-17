# CI/CD 및 HTTPS 배포 가이드

본 프로젝트는 **dev(개발)** 및 **op(운영)** 환경에서 HTTP 요청을 차단하고 **무조건 HTTPS 통신을 강제**합니다. (단, AWS EC2 PostgreSQL DB 통신은 내부 TCP 5432 연결 유지)

---

## 1. HTTPS 통신 적용 구성

```
[ 브라우저 / 클라이언트 ]
         │ (무조건 HTTPS 강제 접속, HTTP 인입 시 301 리다이렉트)
         ▼
[ EC2 Nginx 웹 서버 (Port 443 SSL) ]
   ├── 정적 프론트엔드 파일 서빙 (/usr/share/nginx/html)
   └── /api/ 요청 리버스 프록시 (X-Forwarded-Proto: https 전달)
         ▼
[ NestJS 백엔드 (Port 3001) ]
   └── HSTS 보안 헤더 강제 적용 및 비보안 요청 차단
         ▼ (TCP 5432 일반 연결)
[ PostgreSQL DB (32.236.200.229:5432) ]
```

---

## 2. Nginx HTTPS 설정 적용 (EC2 서버)

1. **설정 파일 복사**:
   저장소의 `CI_CD/nginx_https.conf`를 EC2의 `/etc/nginx/conf.d/travel.conf`로 복사합니다.
   ```bash
   sudo cp CI_CD/nginx_https.conf /etc/nginx/conf.d/travel.conf
   ```

2. **도메인 및 SSL 인증서 발급 (Certbot 추천)**:
   ```bash
   # Certbot 설치 및 Nginx용 무료 Let's Encrypt SSL 인증서 발급
   sudo apt update
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Nginx 설정 검증 및 반영**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 3. GitHub Actions 자동 배포 파이프라인

* **트리거**: `main` 브랜치에 Push되거나 Actions 탭에서 수동 실행 시 작동합니다.
* **빌드 잡 (Build)**: GitHub-hosted 러너에서 React 프로덕션 빌드 수행 (`dist/` 생성).
* **배포 잡 (Deploy)**: EC2 Self-hosted 러너에서 Nginx 웹 루트(`/usr/share/nginx/html`)로 무중단 동기화 배포.
