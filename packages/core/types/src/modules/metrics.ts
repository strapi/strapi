export interface TelemetryService {
  isDisabled: boolean;
  register(): void;
  bootstrap(): void;
  destroy(): void;
  send(event: string, payload?: Record<string, unknown>): Promise<boolean>;
}
