export interface SessionManagerService {
  generateSessionId(): string;
  generateRefreshToken(
    userId: string,
    deviceId: string,
    origin: string
  ): Promise<{ token: string; sessionId: string }>;
}
