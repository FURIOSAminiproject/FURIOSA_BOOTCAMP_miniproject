import { DatabaseModule } from './database/database.module';
import { DatabaseController } from './database/database.controller';
import { Controller, Get, Module } from '@nestjs/common';
import { TravelController } from './travel/travel.controller';
import { TravelService } from './travel/travel.service';
@Controller('health')
class HealthController { @Get() health() { return { status: 'ok' }; } }
@Module({ imports: [DatabaseModule], controllers: [HealthController, TravelController, DatabaseController], providers: [TravelService] })
export class AppModule {}
