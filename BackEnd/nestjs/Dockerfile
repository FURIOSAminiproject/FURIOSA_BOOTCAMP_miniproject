# ==============================================================================
# NestJS 백엔드 멀티스테이지 Dockerfile (환경 분리 지원)
# ==============================================================================

# 1. 빌드 단계 (Builder Stage)
FROM node:22-alpine AS builder

ARG APP_ENV=production
WORKDIR /app

# 의존성 정의 파일 복사 및 설치
COPY package*.json tsconfig.json ./
RUN npm ci

# 소스코드 및 스크립트 복사 후 지정된 환경에 맞춰 TypeScript 컴파일
COPY src ./src
COPY scripts ./scripts
RUN node scripts/build.cjs ${APP_ENV}

# ==============================================================================
# 2. 실행 단계 (Runner Stage - 초경량 프로덕션 이미지)
FROM node:22-alpine AS runner

ARG APP_ENV=production
WORKDIR /app

ENV NODE_ENV=${APP_ENV}
ENV APP_ENV=${APP_ENV}
ENV HOST=0.0.0.0
ENV PORT=3001

# 프로덕션 전용 의존성만 설치
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 컴파일된 dist 폴더 및 스크립트 복사
COPY --from=builder /app/dist ./dist
COPY scripts ./scripts

# 컨테이너 외부로 노출할 포트
EXPOSE 3001

# 백엔드 서버 시작
CMD ["node", "dist/main.js"]
