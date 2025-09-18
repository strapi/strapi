export type ValidateRefreshTokenResult =
  | { isValid: true; userId: string; sessionId: string }
  | { isValid: false };

export interface OriginSessionManagerService {
  generateRefreshToken(
    userId: string,
    deviceId: string | undefined,
    options?: { type?: 'refresh' | 'session' }
  ): Promise<{ token: string; sessionId: string; absoluteExpiresAt: string }>;
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
  invalidateRefreshToken(userId: string, deviceId?: string): Promise<void>;
  isSessionActive(sessionId: string): Promise<boolean>;
}

export interface SessionManagerService {
  generateSessionId(): string;
  defineOrigin(origin: string, config: any): void;
  hasOrigin(origin: string): boolean;
  (origin: string): OriginSessionManagerService;
}
