import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Algorithm, VerifyOptions } from 'jsonwebtoken';
import type { Database } from '@strapi/database';
import { DEFAULT_ALGORITHM } from '../constants';

export interface SessionProvider {
  create(session: SessionData): Promise<SessionData>;
  findBySessionId(sessionId: string): Promise<SessionData | null>;
  updateBySessionId(sessionId: string, data: Partial<SessionData>): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
  deleteExpired(): Promise<void>;
  deleteBy(criteria: { userId?: string; origin?: string; deviceId?: string }): Promise<void>;
}

export interface SessionData {
  id?: string;
  userId: string; // User ID stored as string (key-value store)
  sessionId: string;
  deviceId: string;
  origin: string;
  childId?: string | null;

  type?: 'refresh' | 'session';
  status?: 'active' | 'rotated' | 'revoked';
  expiresAt: Date;
  absoluteExpiresAt?: Date | null;
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

  async updateBySessionId(sessionId: string, data: Partial<SessionData>): Promise<void> {
    await this.db.query(this.contentType).update({ where: { sessionId }, data });
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.db.query(this.contentType).delete({
      where: { sessionId },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.db.query(this.contentType).deleteMany({
      where: { absoluteExpiresAt: { $lt: new Date() } },
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
}

export interface SessionManagerConfig {
  jwtSecret: string;
  accessTokenLifespan: number;
  maxRefreshTokenLifespan: number;
  idleRefreshTokenLifespan: number;
  maxSessionLifespan: number;
  idleSessionLifespan: number;
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
    origin: string,
    options?: { familyType?: 'refresh' | 'session' }
  ): Promise<{ token: string; sessionId: string; absoluteExpiresAt: string }> {
    await this.maybeCleanupExpired();

    const sessionId = this.generateSessionId();
    const familyType = options?.familyType ?? 'refresh';
    const isRefresh = familyType === 'refresh';

    const idleLifespan = isRefresh
      ? this.config.idleRefreshTokenLifespan
      : this.config.idleSessionLifespan;

    const maxLifespan = isRefresh
      ? this.config.maxRefreshTokenLifespan
      : this.config.maxSessionLifespan;

    const now = Date.now();
    const expiresAt = new Date(now + idleLifespan * 1000);
    const absoluteExpiresAt = new Date(now + maxLifespan * 1000);

    // Create the root record first so createdAt can be used for signing.
    const record = await this.provider.create({
      userId,
      sessionId,
      deviceId,
      origin,
      childId: null,
      type: familyType,
      status: 'active',
      expiresAt,
      absoluteExpiresAt,
    });

    const issuedAtSeconds = Math.floor(new Date(record.createdAt ?? new Date()).getTime() / 1000);
    const expiresAtSeconds = Math.floor(new Date(record.expiresAt).getTime() / 1000);

    const payload: RefreshTokenPayload = {
      userId,
      sessionId,
      type: 'refresh',
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      algorithm: this.config.algorithm ?? DEFAULT_ALGORITHM,
      noTimestamp: true,
    });

    return {
      token,
      sessionId,
      absoluteExpiresAt: absoluteExpiresAt.toISOString(),
    };
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

      const now = new Date();
      if (new Date(session.expiresAt) <= now) {
        return { isValid: false };
      }

      // Absolute family expiry check
      if (session.absoluteExpiresAt && new Date(session.absoluteExpiresAt) <= now) {
        return { isValid: false };
      }

      // Only 'active' sessions are eligible to create access tokens.
      if (session.status !== 'active') {
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
      if (error instanceof jwt.JsonWebTokenError) {
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
      userId: String(validation.userId!),
      sessionId: validation.sessionId!,
      type: 'access',
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      algorithm: this.config.algorithm ?? DEFAULT_ALGORITHM,
      expiresIn: this.config.accessTokenLifespan,
    });

    return { token };
  }

  async rotateRefreshToken(refreshToken: string): Promise<
    | {
        token: string;
        sessionId: string;
        absoluteExpiresAt: string;
        type: 'refresh' | 'session';
      }
    | { error: string }
  > {
    try {
      const payload = jwt.verify(refreshToken, this.config.jwtSecret, {
        algorithms: [this.config.algorithm ?? DEFAULT_ALGORITHM],
      }) as RefreshTokenPayload;

      if (!payload || payload.type !== 'refresh') {
        return { error: 'invalid_refresh_token' };
      }

      const current = await this.provider.findBySessionId(payload.sessionId);
      if (!current) {
        return { error: 'invalid_refresh_token' };
      }

      // If parent already has a child, return the same child token
      if (current.childId) {
        const child = await this.provider.findBySessionId(current.childId);

        if (child) {
          const childIat = Math.floor(new Date(child.createdAt ?? new Date()).getTime() / 1000);
          const childExp = Math.floor(new Date(child.expiresAt).getTime() / 1000);

          const childPayload: RefreshTokenPayload = {
            userId: child.userId,
            sessionId: child.sessionId,
            type: 'refresh',
            iat: childIat,
            exp: childExp,
          };

          const childToken = jwt.sign(childPayload, this.config.jwtSecret, {
            algorithm: this.config.algorithm ?? DEFAULT_ALGORITHM,
            noTimestamp: true,
          });

          let absoluteExpiresAt;
          if (child.absoluteExpiresAt) {
            absoluteExpiresAt =
              typeof child.absoluteExpiresAt === 'string'
                ? child.absoluteExpiresAt
                : child.absoluteExpiresAt.toISOString();
          } else {
            absoluteExpiresAt = new Date(0).toISOString();
          }

          return {
            token: childToken,
            sessionId: child.sessionId,
            absoluteExpiresAt,
            type: child.type ?? 'refresh',
          };
        }
      }

      const now = Date.now();
      const familyType = current.type ?? 'refresh';
      const idleLifespan =
        familyType === 'refresh'
          ? this.config.idleRefreshTokenLifespan
          : this.config.idleSessionLifespan;

      // Enforce idle window since creation of the current token
      if (current.createdAt && now - new Date(current.createdAt).getTime() > idleLifespan * 1000) {
        return { error: 'idle_window_elapsed' };
      }

      // Enforce max family window using absoluteExpiresAt
      const absolute = current.absoluteExpiresAt
        ? new Date(current.absoluteExpiresAt).getTime()
        : now;
      if (absolute <= now) {
        return { error: 'max_window_elapsed' };
      }

      // Create child token
      const childSessionId = this.generateSessionId();
      const childExpiresAt = new Date(now + idleLifespan * 1000);

      const childRecord = await this.provider.create({
        userId: current.userId,
        sessionId: childSessionId,
        deviceId: current.deviceId,
        origin: current.origin,
        childId: null,
        type: familyType,
        status: 'active',
        expiresAt: childExpiresAt,
        absoluteExpiresAt: current.absoluteExpiresAt ?? new Date(absolute),
      });

      const childIat = Math.floor(new Date(childRecord.createdAt ?? new Date()).getTime() / 1000);
      const childExp = Math.floor(new Date(childRecord.expiresAt).getTime() / 1000);
      const payloadOut: RefreshTokenPayload = {
        userId: current.userId,
        sessionId: childSessionId,
        type: 'refresh',
        iat: childIat,
        exp: childExp,
      };
      const childToken = jwt.sign(payloadOut, this.config.jwtSecret, {
        algorithm: this.config.algorithm ?? DEFAULT_ALGORITHM,
        noTimestamp: true,
      });

      await this.provider.updateBySessionId(current.sessionId, {
        status: 'rotated',
        childId: childSessionId,
      });

      let absoluteExpiresAt;
      if (childRecord.absoluteExpiresAt) {
        absoluteExpiresAt =
          typeof childRecord.absoluteExpiresAt === 'string'
            ? childRecord.absoluteExpiresAt
            : childRecord.absoluteExpiresAt.toISOString();
      } else {
        absoluteExpiresAt = new Date(absolute).toISOString();
      }

      return {
        token: childToken,
        sessionId: childSessionId,
        absoluteExpiresAt,
        type: familyType,
      };
    } catch {
      return { error: 'invalid_refresh_token' };
    }
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
