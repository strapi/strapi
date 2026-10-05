export type ValidateRefreshTokenResult =
  | { isValid: true; userId: string; sessionId: string }
  | { isValid: false };

export interface SessionEntry {
  id?: string;
  userId: string;
  sessionId: string;
  deviceId?: string;
  origin: string;
  childId?: string | null;
  type?: 'refresh' | 'session';
  status?: 'active' | 'rotated' | 'revoked';
  metadata?: Record<string, unknown> | null;
  expiresAt: Date;
  absoluteExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OriginSessionManagerService {
  generateRefreshToken(
    userId: string,
    deviceId: string | undefined,
    options?: { type?: 'refresh' | 'session'; metadata?: Record<string, unknown> }
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
  listSessions(userId: string): Promise<SessionEntry[]>;
  revokeSessionById(userId: string, sessionId: string): Promise<boolean>;
  isSessionActive(sessionId: string): Promise<boolean>;
}

export interface SessionManagerService {
  generateSessionId(): string;
  defineOrigin(origin: string, config: any): void;
  hasOrigin(origin: string): boolean;
  (origin: string): OriginSessionManagerService;
}
