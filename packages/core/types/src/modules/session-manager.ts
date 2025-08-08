export type ValidateRefreshTokenResult =
  | { isValid: true; userId: string; sessionId: string }
  | { isValid: false };

export interface SessionManagerService {
  generateSessionId(): string;
  generateRefreshToken(
    userId: string,
    deviceId: string,
    origin: string
  ): Promise<{ token: string; sessionId: string }>;
  validateRefreshToken(token: string): Promise<ValidateRefreshTokenResult>;
  generateAccessToken(refreshToken: string): Promise<{ token: string } | { error: string }>;
}
