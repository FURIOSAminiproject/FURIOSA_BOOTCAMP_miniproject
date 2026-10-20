import type { INestApplication } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export function configureApp(app: INestApplication) {
  app.use(cookieParser());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // 기존 여행·헬스 API의 /api와 로그인 화면·OAuth 쿠키의 /auth 경로를 함께 유지한다.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'auth/*path', method: RequestMethod.ALL }],
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
}
