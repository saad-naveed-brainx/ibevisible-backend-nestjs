export interface HealthStatus {
    status: 'ok';
    service: string;
    timestamp: string;
    uptime: number;
}
export declare class HealthService {
    check(): HealthStatus;
}
