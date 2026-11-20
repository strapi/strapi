import type { IsStrict } from '../core/strictness';

export type ValidateRefreshTokenResult =
  { isValid: true; userId: string; sessionId: string } | { isValid: false };

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

/**
 * An algorithm `jsonwebtoken` signs and verifies tokens with (`Algorithm` in `@types/jsonwebtoken`).
 * It rejects any other value when it signs.
 */
export type JwtAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512'
  | 'none';

/**
 * The config of one session origin, as `defineOrigin` stores it (`SessionManagerConfig` in
 * `@strapi/core` `services/session-manager.ts`). Lifespans are in seconds.
 */
export interface SessionOriginConfig {
  jwtSecret?: string;
  accessTokenLifespan: number;
  maxRefreshTokenLifespan: number;
  idleRefreshTokenLifespan: number;
  maxSessionLifespan: number;
  idleSessionLifespan: number;
  algorithm?: JwtAlgorithm;
  jwtOptions?: Record<string, unknown>;
}

export interface SessionManagerService {
  generateSessionId(): string;
  defineOrigin(origin: string, config: IsStrict extends false ? any : SessionOriginConfig): void;
  hasOrigin(origin: string): boolean;
  (origin: string): OriginSessionManagerService;
}
