export type ValidateRefreshTokenResult =
  | { isValid: true; userId: string; sessionId: string }
  | { isValid: false };

export interface SessionManagerService {
  generateSessionId(): string;
  generateRefreshToken(
    userId: string,
    deviceId: string,
    origin: string,
    options?: { familyType?: 'refresh' | 'session' }
  ): Promise<{ token: string; sessionId: string; absoluteExpiresAt: string }>;
  validateAccessToken(token: string):
    | {
        isValid: true;
        payload: { userId: string; sessionId: string; type: 'access'; exp: number; iat: number };
      }
    | {
        isValid: false;
        payload: null;
      };
  validateRefreshToken(token: string): Promise<ValidateRefreshTokenResult>;
  generateAccessToken(refreshToken: string): Promise<{ token: string } | { error: string }>;
  rotateRefreshToken(refreshToken: string): Promise<
    | {
        token: string;
        sessionId: string;
        absoluteExpiresAt: string;
        type: 'refresh' | 'session';
      }
    | { error: string }
  >;
  invalidateRefreshToken(origin: string, userId: string, deviceId?: string): Promise<void>;
  isSessionActive(sessionId: string): Promise<boolean>;
}
