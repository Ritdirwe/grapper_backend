import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('app.nodeEnv'),
      database: {
        host: this.configService.get('database.host'),
        database: this.configService.get('database.database'),
      },
    };
  }
}
