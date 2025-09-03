import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Algorithm, VerifyOptions } from 'jsonwebtoken';
import type { Database } from '@strapi/database';
import { DEFAULT_ALGORITHM } from '../constants';

export interface SessionProvider {
  create(session: SessionData): Promise<SessionData>;
  findBySessionId(sessionId: string): Promise<SessionData | null>;
  findByIdentifier(userId: string): Promise<SessionData[]>;
  deleteBySessionId(sessionId: string): Promise<void>;
  deleteExpiredByIdentifier(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
  deleteBy(criteria: { userId?: string; origin?: string; deviceId?: string }): Promise<void>;
}

export interface SessionData {
  id?: string;
  userId: string; // User ID stored as string (key-value store)
  sessionId: string;
  deviceId: string;
  origin: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
  exp: number;
  iat: number;
}

export interface AccessTokenPayload {
  userId: string;
  sessionId: string;
  type: 'access';
  exp: number;
  iat: number;
}

export type TokenPayload = RefreshTokenPayload | AccessTokenPayload;

export interface ValidateRefreshTokenResult {
  isValid: boolean;
  userId?: string;
  sessionId?: string;
  error?:
    | 'invalid_token'
    | 'token_expired'
    | 'session_not_found'
    | 'session_expired'
    | 'wrong_token_type';
}

class DatabaseSessionProvider implements SessionProvider {
  private db: Database;

  private contentType: string;

  constructor(db: Database, contentType: string) {
    this.db = db;
    this.contentType = contentType;
  }

  async create(session: SessionData): Promise<SessionData> {
    const result = await this.db.query(this.contentType).create({
      data: session,
    });
    return result as SessionData;
  }

  async findBySessionId(sessionId: string): Promise<SessionData | null> {
    const result = await this.db.query(this.contentType).findOne({
      where: { sessionId },
    });
    return result as SessionData | null;
  }

  async findByIdentifier(userId: string): Promise<SessionData[]> {
    const results = await this.db.query(this.contentType).findMany({
      where: { userId },
    });
    return results as SessionData[];
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.db.query(this.contentType).delete({
      where: { sessionId },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.db.query(this.contentType).deleteMany({
      where: { expiresAt: { $lt: new Date() } },
    });
  }

  async deleteBy(criteria: { userId?: string; origin?: string; deviceId?: string }): Promise<void> {
    await this.db.query(this.contentType).deleteMany({
      where: {
        ...(criteria.userId ? { userId: criteria.userId } : {}),
        ...(criteria.origin ? { origin: criteria.origin } : {}),
        ...(criteria.deviceId ? { deviceId: criteria.deviceId } : {}),
      },
    });
  }

  async deleteExpiredByIdentifier(userId: string): Promise<void> {
    await this.db.query(this.contentType).delete({
      where: { userId, expiresAt: { $lt: new Date() } },
    });
  }
}

export interface SessionManagerConfig {
  jwtSecret: string;
  refreshTokenLifespan: number; // default 30 days
  accessTokenLifespan: number; // default 1 hour
  /**
   * JWT signing/verification algorithm. Defaults to 'HS256' when not provided.
   */
  algorithm?: Algorithm;
}

class SessionManager {
  private provider: SessionProvider;

  private config: SessionManagerConfig;

  // Run expired cleanup only every N calls to avoid extra queries
  private cleanupInvocationCounter: number = 0;

  private readonly cleanupEveryCalls: number = 50;

  constructor(provider: SessionProvider, config: SessionManagerConfig) {
    this.provider = provider;
    this.config = config;
  }

  generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async maybeCleanupExpired(): Promise<void> {
    this.cleanupInvocationCounter += 1;
    if (this.cleanupInvocationCounter >= this.cleanupEveryCalls) {
      this.cleanupInvocationCounter = 0;

      await this.provider.deleteExpired();
    }
  }

  async generateRefreshToken(
    userId: string,
    deviceId: string,
    origin: string
  ): Promise<{ token: string; sessionId: string }> {
    await this.maybeCleanupExpired();

    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.config.refreshTokenLifespan * 1000);

    await this.provider.create({
      userId,
      sessionId,
      deviceId,
      origin,
      expiresAt,
    });

    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      sessionId,
      type: 'refresh',
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.refreshTokenLifespan,
      algorithm: this.config.algorithm ?? DEFAULT_ALGORITHM,
    });

    return { token, sessionId };
  }

  validateAccessToken(
    token: string
  ): { isValid: true; payload: AccessTokenPayload } | { isValid: false; payload: null } {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret, {
        algorithms: [this.config.algorithm ?? DEFAULT_ALGORITHM],
      }) as TokenPayload;

      // Ensure this is an access token
      if (!payload || payload.type !== 'access') {
        return { isValid: false, payload: null };
      }

      return { isValid: true, payload };
    } catch (err) {
      return { isValid: false, payload: null };
    }
  }

  async validateRefreshToken(token: string): Promise<ValidateRefreshTokenResult> {
    try {
      const verifyOptions: VerifyOptions = {
        algorithms: [this.config.algorithm ?? DEFAULT_ALGORITHM],
      };

      const payload = jwt.verify(
        token,
        this.config.jwtSecret,
        verifyOptions
      ) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        return { isValid: false };
      }

      const session = await this.provider.findBySessionId(payload.sessionId);
      if (!session) {
        return { isValid: false };
      }

      if (new Date(session.expiresAt) <= new Date()) {
        // Clean up expired session
        await this.provider.deleteBySessionId(payload.sessionId);
        return { isValid: false };
      }

      if (session.userId !== payload.userId) {
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: payload.userId,
        sessionId: payload.sessionId,
      };
    } catch (error: any) {
      // If the token is expired, verify signature ignoring expiration to safely extract payload
      // and clean up the corresponding session in database.
      if (error instanceof jwt.JsonWebTokenError) {
        if (error.name === 'TokenExpiredError') {
          try {
            const verifyResult = jwt.verify(token, this.config.jwtSecret, {
              // Validate signature but ignore exp to retrieve session information
              ignoreExpiration: true,
              algorithms: [this.config.algorithm ?? DEFAULT_ALGORITHM],
            });

            // Type guard to ensure we have an object payload, not a string
            if (typeof verifyResult === 'string') {
              return { isValid: false };
            }

            const expiredPayload = verifyResult as RefreshTokenPayload;
            if (expiredPayload?.sessionId) {
              await this.provider.deleteBySessionId(expiredPayload.sessionId);
            }
          } catch {
            // If we cannot recover payload safely, skip cleanup
          }
        }
        return { isValid: false };
      }

      throw error;
    }
  }

  async invalidateRefreshToken(origin: string, userId: string, deviceId?: string): Promise<void> {
    await this.provider.deleteBy({ userId, origin, deviceId });
  }

  async generateAccessToken(refreshToken: string): Promise<{ token: string } | { error: string }> {
    const validation = await this.validateRefreshToken(refreshToken);

    if (!validation.isValid) {
      return { error: 'invalid_refresh_token' };
    }

    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      userId: validation.userId!,
      sessionId: validation.sessionId!,
      type: 'access',
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      algorithm: this.config.algorithm ?? DEFAULT_ALGORITHM,
      expiresIn: this.config.accessTokenLifespan,
    });

    return { token };
  }

  /**
   * Returns true when a session exists and is not expired.
   * If the session exists but is expired, it will be deleted as part of this check.
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.provider.findBySessionId(sessionId);
    if (!session) {
      return false;
    }

    if (new Date(session.expiresAt) <= new Date()) {
      // Clean up expired session eagerly
      await this.provider.deleteBySessionId(sessionId);

      return false;
    }

    return true;
  }
}

const createDatabaseProvider = (db: Database, contentType: string): SessionProvider => {
  return new DatabaseSessionProvider(db, contentType);
};

const createSessionManager = ({ db, config }: { db: Database; config: SessionManagerConfig }) => {
  const provider = createDatabaseProvider(db, 'admin::session');
  return new SessionManager(provider, config);
};

export { createSessionManager, createDatabaseProvider };
