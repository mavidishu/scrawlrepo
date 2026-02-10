import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  ready() {
    // Add database and redis health checks here
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
