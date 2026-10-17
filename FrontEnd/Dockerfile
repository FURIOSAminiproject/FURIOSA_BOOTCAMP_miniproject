# ==============================================================================
# React(Vite) 프론트엔드 멀티스테이지 Dockerfile
# ==============================================================================

# 1. 빌드 단계 (Builder Stage)
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 정의 파일 복사 및 설치
COPY package*.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci

# 소스코드 복사
COPY src ./src

# .env.production이 없을 경우 빌드 오류 방지를 위한 기본 환경 설정
RUN if [ ! -f .env.production ]; then \
        echo "BACKEND_URL=http://backend:3001" > .env.production && \
        echo "ENABLE_TLS=false" >> .env.production; \
    fi

# React 정적 번들 빌드
RUN npm run build:prod

# ==============================================================================
# 2. 서빙 단계 (Runner Stage - Nginx 초경량 이미지)
FROM nginx:alpine AS runner

# 빌드된 정적 HTML/JS/CSS 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 리버스 프록시 및 SPA 라우팅 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
