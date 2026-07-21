import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'ibevisible-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
