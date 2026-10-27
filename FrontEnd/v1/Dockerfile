# ==============================================================================
# React(Vite) 프론트엔드 멀티스테이지 Dockerfile (환경 분리 및 호스트 SSL 연동)
# ==============================================================================

# 1. 빌드 단계 (Builder Stage)
FROM node:22-alpine AS builder

ARG APP_ENV=production
WORKDIR /app

# 의존성 정의 파일 복사 및 설치
COPY package*.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci --no-audit && npm cache clean --force

# 소스코드 복사
COPY src ./src

# .env 파일이 없을 경우 빌드 오류 방지를 위한 기본 환경 설정
RUN if [ ! -f .env.${APP_ENV} ]; then \
        echo "BACKEND_URL=http://backend:3001" > .env.${APP_ENV}; \
        if [ "$APP_ENV" = "production" ] || [ "$APP_ENV" = "prod" ]; then \
            echo "ENABLE_TLS=true" >> .env.${APP_ENV}; \
        else \
            echo "ENABLE_TLS=false" >> .env.${APP_ENV}; \
        fi; \
    fi

# 선택된 환경(production, development, localdev 등)에 맞게 React 정적 번들 빌드
RUN if [ "$APP_ENV" = "development" ] || [ "$APP_ENV" = "dev" ]; then \
        npm run build:dev; \
    elif [ "$APP_ENV" = "local" ] || [ "$APP_ENV" = "localdev" ]; then \
        npm run build:local; \
    else \
        npm run build:prod; \
    fi

# ==============================================================================
# 2. 서빙 단계 (Runner Stage - Nginx 초경량 이미지)
FROM nginx:alpine AS runner

# Let's Encrypt 챌린지 및 Nginx 템플릿 디렉토리 준비
RUN mkdir -p /var/www/certbot /etc/nginx/templates

# 빌드된 정적 HTML/JS/CSS 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx HTTP / SSL 설정 템플릿 및 자동 감지 엔트리포인트 스크립트 복사
COPY nginx_http.conf /etc/nginx/templates/nginx_http.conf
COPY nginx_ssl.conf /etc/nginx/templates/nginx_ssl.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# HTTP(80) 및 HTTPS(443) 포트 개방
EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
