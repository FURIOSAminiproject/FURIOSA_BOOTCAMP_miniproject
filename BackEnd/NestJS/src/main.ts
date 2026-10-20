import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { existsSync, readFileSync } from 'node:fs';
import { configureApp } from './configure-app';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');

  // 환경 파일의 ENABLE_TLS (true/false) 설정에 따라 TLS 강제 적용 여부 결정 (기본값: false)
  const enableTls = process.env.ENABLE_TLS === 'true';

  // SSL 인증서 파일이 지정된 경우 직접 HTTPS 구동
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  if (enableTls && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    if (existsSync(process.env.SSL_KEY_PATH) && existsSync(process.env.SSL_CERT_PATH)) {
      httpsOptions = {
        key: readFileSync(process.env.SSL_KEY_PATH),
        cert: readFileSync(process.env.SSL_CERT_PATH),
      };
    }
  }

  const app = await NestFactory.create(AppModule, httpsOptions ? { httpsOptions } : {});
  configureApp(app);

  // ENABLE_TLS가 true일 때만 HTTPS 강제 리다이렉트 및 HSTS 보안 헤더 적용
  if (enableTls) {
    app.use((req: any, res: any, next: () => void) => {
      // HSTS 헤더 적용 (브라우저에게 HTTPS 통신 강제)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
      const host = req.headers?.host;

      // 외부 클라이언트가 HTTP로 접속한 경우 HTTPS로 301 영구 리다이렉트
      if (!isHttps && host && !host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
        return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
      }
      next();
    });
  }

  app.enableShutdownHooks();
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
