import { DatabaseModule } from './database/database.module';
import { DatabaseController } from './database/database.controller';
import { Controller, Get, Module } from '@nestjs/common';
import { TravelController } from './travel/travel.controller';
import { TravelService } from './travel/travel.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TourBatchModule } from './places/batch/tour-batch.module';
@Controller('health')
class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      version: '1.1.0',
      message: '길벗 AI 여행사 백엔드 실시간 배포 성공',
      timestamp: new Date().toISOString(),
    };
  }
}
@Module({
  // 환경 파일은 start.cjs 또는 Compose가 선택한다. 인증 모듈도 같은 환경을 사용한다.
  imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), DatabaseModule, AuthModule, TourBatchModule.register()],
  controllers: [AppController, HealthController, TravelController, DatabaseController],
  providers: [AppService, TravelService],
})
export class AppModule {}
