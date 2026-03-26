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
  createSession(input: {
    userId: string;
    sessionId?: string;
    deviceId?: string;
    type?: 'refresh' | 'session';
    status?: 'active' | 'rotated' | 'revoked';
    expiresAt?: Date;
    absoluteExpiresAt?: Date | null;
    metadata?: Record<string, unknown>;
  }): Promise<{
    id?: string;
    userId: string;
    sessionId: string;
    deviceId?: string;
    origin: string;
    childId?: string | null;
    type?: 'refresh' | 'session';
    status?: 'active' | 'rotated' | 'revoked';
    expiresAt: Date;
    absoluteExpiresAt?: Date | null;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  getSession(sessionId: string): Promise<{
    id?: string;
    userId: string;
    sessionId: string;
    deviceId?: string;
    origin: string;
    childId?: string | null;
    type?: 'refresh' | 'session';
    status?: 'active' | 'rotated' | 'revoked';
    expiresAt: Date;
    absoluteExpiresAt?: Date | null;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
  } | null>;
  updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>,
    options?: { merge?: boolean }
  ): Promise<void>;
}

export interface SessionManagerService {
  generateSessionId(): string;
  defineOrigin(origin: string, config: any): void;
  hasOrigin(origin: string): boolean;
  createSession(input: {
    userId: string;
    origin: string;
    sessionId?: string;
    deviceId?: string;
    type?: 'refresh' | 'session';
    status?: 'active' | 'rotated' | 'revoked';
    expiresAt?: Date;
    absoluteExpiresAt?: Date | null;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
  getSession(sessionId: string, origin: string): Promise<unknown>;
  updateSessionMetadata(
    sessionId: string,
    origin: string,
    metadata: Record<string, unknown>,
    options?: { merge?: boolean }
  ): Promise<void>;
  (origin: string): OriginSessionManagerService;
}
