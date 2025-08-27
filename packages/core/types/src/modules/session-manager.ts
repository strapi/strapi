export interface SessionManagerService {
  generateSessionId(): string;
  generateRefreshToken(
    userId: string,
    deviceId: string,
    origin: string
  ): Promise<{ token: string; sessionId: string }>;
  validateAccessToken(token: string):
    | {
        isValid: true;
        payload: { userId: string; sessionId: string; type: 'access'; exp: number; iat: number };
      }
    | {
        isValid: false;
        payload: null;
      };
}
