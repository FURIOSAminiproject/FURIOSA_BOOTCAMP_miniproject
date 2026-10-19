import { DatabaseModule } from './database/database.module';
import { DatabaseController } from './database/database.controller';
import { Controller, Get, Module } from '@nestjs/common';
import { TravelController } from './travel/travel.controller';
import { TravelService } from './travel/travel.service';
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
@Module({ imports: [DatabaseModule], controllers: [HealthController, TravelController, DatabaseController], providers: [TravelService] })
export class AppModule {}
