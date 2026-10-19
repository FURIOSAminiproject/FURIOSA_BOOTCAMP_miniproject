import 'dotenv/config';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // Enable CORS for frontend requests (React app on port 3000)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 NestJS 서버가 구동되었습니다: http://localhost:${port}`);
  console.log(`📝 회원가입 엔드포인트: POST http://localhost:${port}/auth/register`);
}
void bootstrap();

