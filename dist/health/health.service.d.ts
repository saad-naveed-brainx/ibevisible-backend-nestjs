import { DataSource } from 'typeorm';
export interface HealthStatus {
    status: 'ok' | 'degraded';
    service: string;
    timestamp: string;
    uptime: number;
    database: 'up' | 'down';
}
export declare class HealthService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    check(): Promise<HealthStatus>;
    private pingDatabase;
}
