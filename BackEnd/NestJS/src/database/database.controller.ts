import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
@Controller('health')
export class DatabaseController {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}
  @Get('db') async health() {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch { throw new ServiceUnavailableException('Database unavailable'); }
  }
}
