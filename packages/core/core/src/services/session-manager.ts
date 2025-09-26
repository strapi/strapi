import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { VerifyOptions, Algorithm } from 'jsonwebtoken';
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
  deviceId?: string; // Optional for origins that don't need device tracking
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
  jwtSecret?: string;
  accessTokenLifespan: number;
  maxRefreshTokenLifespan: number;
  idleRefreshTokenLifespan: number;
  maxSessionLifespan: number;
  idleSessionLifespan: number;
  algorithm?: Algorithm;
  jwtOptions?: Record<string, unknown>;
}

class OriginSessionManager {
  constructor(
    private sessionManager: SessionManager,
    private origin: string
  ) {}

  async generateRefreshToken(
    userId: string,
    deviceId: string | undefined,
    options?: { type?: 'refresh' | 'session' }
  ): Promise<{ token: string; sessionId: string; absoluteExpiresAt: string }> {
    return this.sessionManager.generateRefreshToken(userId, deviceId, this.origin, options);
  }

  async generateAccessToken(refreshToken: string): Promise<{ token: string } | { error: string }> {
    return this.sessionManager.generateAccessToken(refreshToken, this.origin);
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
    return this.sessionManager.rotateRefreshToken(refreshToken, this.origin);
  }

  validateAccessToken(
    token: string
  ): { isValid: true; payload: AccessTokenPayload } | { isValid: false; payload: null } {
    return this.sessionManager.validateAccessToken(token, this.origin);
  }

  async validateRefreshToken(token: string): Promise<ValidateRefreshTokenResult> {
    return this.sessionManager.validateRefreshToken(token, this.origin);
  }

  async invalidateRefreshToken(userId: string, deviceId?: string): Promise<void> {
    return this.sessionManager.invalidateRefreshToken(this.origin, userId, deviceId);
  }

  /**
   * Returns true when a session exists and is not expired for this origin.
   * If the session exists but is expired, it will be deleted as part of this check.
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    return this.sessionManager.isSessionActive(sessionId, this.origin);
  }
}

class SessionManager {
  private provider: SessionProvider;

  // Store origin-specific configurations
  private originConfigs: Map<string, SessionManagerConfig> = new Map();

  // Run expired cleanup only every N calls to avoid extra queries
  private cleanupInvocationCounter: number = 0;

  private readonly cleanupEveryCalls: number = 50;

  constructor(provider: SessionProvider) {
    this.provider = provider;
  }

  /**
   * Define configuration for a specific origin
   */
  defineOrigin(origin: string, config: SessionManagerConfig): void {
    this.originConfigs.set(origin, config);
  }

  /**
   * Check if an origin is defined
   */
  hasOrigin(origin: string): boolean {
    return this.originConfigs.has(origin);
  }

  /**
   * Get configuration for a specific origin, throw error if not defined
   */
  private getConfigForOrigin(origin: string): SessionManagerConfig {
    const originConfig = this.originConfigs.get(origin);
    if (originConfig) {
      return originConfig;
    }
    throw new Error(
      `SessionManager: Origin '${origin}' is not defined. Please define it using defineOrigin('${origin}', config).`
    );
  }

  /**
   * Get the appropriate JWT key based on the algorithm
   */
  private getJwtKey(
    config: SessionManagerConfig,
    algorithm: Algorithm,
    operation: 'sign' | 'verify'
  ): string {
    const isAsymmetric =
      algorithm.startsWith('RS') || algorithm.startsWith('ES') || algorithm.startsWith('PS');

    if (isAsymmetric) {
      // For asymmetric algorithms, check if user has provided proper key configuration
      if (operation === 'sign') {
        const privateKey = config.jwtOptions?.privateKey as string;
        if (privateKey) {
          return privateKey;
        }
        throw new Error(
          `SessionManager: Private key is required for asymmetric algorithm ${algorithm}. Please configure admin.auth.options.privateKey.`
        );
      } else {
        const publicKey = config.jwtOptions?.publicKey as string;
        if (publicKey) {
          return publicKey;
        }
        throw new Error(
          `SessionManager: Public key is required for asymmetric algorithm ${algorithm}. Please configure admin.auth.options.publicKey.`
        );
      }
    } else {
      if (!config.jwtSecret) {
        throw new Error(
          `SessionManager: Secret key is required for symmetric algorithm ${algorithm}`
        );
      }
      return config.jwtSecret;
    }
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

  /**
   * Get the cleanup every calls threshold
   */
  get cleanupThreshold(): number {
    return this.cleanupEveryCalls;
  }

  async generateRefreshToken(
    userId: string,
    deviceId: string | undefined,
    origin: string,
    options?: { type?: 'refresh' | 'session' }
  ): Promise<{ token: string; sessionId: string; absoluteExpiresAt: string }> {
    if (!origin || typeof origin !== 'string') {
      throw new Error(
        'SessionManager: Origin parameter is required and must be a non-empty string'
      );
    }

    await this.maybeCleanupExpired();

    const config = this.getConfigForOrigin(origin);
    const algorithm = config.algorithm || DEFAULT_ALGORITHM;
    const jwtKey = this.getJwtKey(config, algorithm, 'sign');
    const sessionId = this.generateSessionId();
    const tokenType = options?.type ?? 'refresh';
    const isRefresh = tokenType === 'refresh';

    const idleLifespan = isRefresh ? config.idleRefreshTokenLifespan : config.idleSessionLifespan;

    const maxLifespan = isRefresh ? config.maxRefreshTokenLifespan : config.maxSessionLifespan;

    const now = Date.now();
    const expiresAt = new Date(now + idleLifespan * 1000);
    const absoluteExpiresAt = new Date(now + maxLifespan * 1000);

    // Create the root record first so createdAt can be used for signing.
    const record = await this.provider.create({
      userId,
      sessionId,
      ...(deviceId && { deviceId }),
      origin,
      childId: null,
      type: tokenType,
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

    // Filter out conflicting options that are already handled by the payload or used for key selection
    const jwtOptions = config.jwtOptions || {};
    const { expiresIn, privateKey, publicKey, ...jwtSignOptions } = jwtOptions;

    const token = jwt.sign(payload, jwtKey, {
      algorithm,
      noTimestamp: true,
      ...jwtSignOptions,
    });

    return {
      token,
      sessionId,
      absoluteExpiresAt: absoluteExpiresAt.toISOString(),
    };
  }

  validateAccessToken(
    token: string,
    origin: string
  ): { isValid: true; payload: AccessTokenPayload } | { isValid: false; payload: null } {
    if (!origin || typeof origin !== 'string') {
      throw new Error(
        'SessionManager: Origin parameter is required and must be a non-empty string'
      );
    }

    try {
      const config = this.getConfigForOrigin(origin);
      const algorithm = config.algorithm || DEFAULT_ALGORITHM;
      const jwtKey = this.getJwtKey(config, algorithm, 'verify');
      const payload = jwt.verify(token, jwtKey, {
        algorithms: [algorithm],
        ...config.jwtOptions,
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

  async validateRefreshToken(token: string, origin: string): Promise<ValidateRefreshTokenResult> {
    if (!origin || typeof origin !== 'string') {
      throw new Error(
        'SessionManager: Origin parameter is required and must be a non-empty string'
      );
    }

    try {
      const config = this.getConfigForOrigin(origin);
      const algorithm = config.algorithm || DEFAULT_ALGORITHM;
      const jwtKey = this.getJwtKey(config, algorithm, 'verify');
      const verifyOptions: VerifyOptions = {
        algorithms: [algorithm],
        ...config.jwtOptions,
      };

      const payload = jwt.verify(token, jwtKey, verifyOptions) as RefreshTokenPayload;

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

  async generateAccessToken(
    refreshToken: string,
    origin: string
  ): Promise<{ token: string } | { error: string }> {
    if (!origin || typeof origin !== 'string') {
      throw new Error(
        'SessionManager: Origin parameter is required and must be a non-empty string'
      );
    }

    const validation = await this.validateRefreshToken(refreshToken, origin);

    if (!validation.isValid) {
      return { error: 'invalid_refresh_token' };
    }

    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      userId: String(validation.userId!),
      sessionId: validation.sessionId!,
      type: 'access',
    };

    const config = this.getConfigForOrigin(origin);
    const algorithm = config.algorithm || DEFAULT_ALGORITHM;
    const jwtKey = this.getJwtKey(config, algorithm, 'sign');
    // Filter out conflicting options that are already handled by the payload or used for key selection
    const jwtOptions = config.jwtOptions || {};
    const { expiresIn, privateKey, publicKey, ...jwtSignOptions } = jwtOptions;

    const token = jwt.sign(payload, jwtKey, {
      algorithm,
      expiresIn: config.accessTokenLifespan,
      ...jwtSignOptions,
    });

    return { token };
  }

  async rotateRefreshToken(
    refreshToken: string,
    origin: string
  ): Promise<
    | {
        token: string;
        sessionId: string;
        absoluteExpiresAt: string;
        type: 'refresh' | 'session';
      }
    | { error: string }
  > {
    if (!origin || typeof origin !== 'string') {
      throw new Error(
        'SessionManager: Origin parameter is required and must be a non-empty string'
      );
    }

    try {
      const config = this.getConfigForOrigin(origin);
      const algorithm = config.algorithm || DEFAULT_ALGORITHM;
      const jwtKey = this.getJwtKey(config, algorithm, 'verify');
      const payload = jwt.verify(refreshToken, jwtKey, {
        algorithms: [algorithm],
        ...config.jwtOptions,
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

          // Filter out conflicting options that are already handled by the payload
          const { expiresIn, ...jwtSignOptions } = config.jwtOptions || {};

          const childToken = jwt.sign(childPayload, jwtKey, {
            algorithm,
            noTimestamp: true,
            ...jwtSignOptions,
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
      const tokenType = current.type ?? 'refresh';
      const idleLifespan =
        tokenType === 'refresh' ? config.idleRefreshTokenLifespan : config.idleSessionLifespan;

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
        ...(current.deviceId && { deviceId: current.deviceId }),
        origin: current.origin,
        childId: null,
        type: tokenType,
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
      // Filter out conflicting options that are already handled by the payload
      const { expiresIn, ...jwtSignOptions } = config.jwtOptions || {};

      const childToken = jwt.sign(payloadOut, jwtKey, {
        algorithm,
        noTimestamp: true,
        ...jwtSignOptions,
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
        type: tokenType,
      };
    } catch {
      return { error: 'invalid_refresh_token' };
    }
  }

  /**
   * Returns true when a session exists and is not expired.
   * If the session exists but is expired, it will be deleted as part of this check.
   */
  async isSessionActive(sessionId: string, origin: string): Promise<boolean> {
    const session = await this.provider.findBySessionId(sessionId);
    if (!session) {
      return false;
    }

    if (session.origin !== origin) {
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

const createSessionManager = ({
  db,
}: {
  db: Database;
}): SessionManager & ((origin: string) => OriginSessionManager) => {
  const provider = createDatabaseProvider(db, 'admin::session');
  const sessionManager = new SessionManager(provider);

  // Add callable functionality
  const fluentApi = (origin: string): OriginSessionManager => {
    if (!origin || typeof origin !== 'string') {
      throw new Error(
        'SessionManager: Origin parameter is required and must be a non-empty string'
      );
    }
    return new OriginSessionManager(sessionManager, origin);
  };

  // Attach only the public SessionManagerService API to the callable
  const api = fluentApi as unknown as any;
  api.generateSessionId = sessionManager.generateSessionId.bind(sessionManager);
  api.defineOrigin = sessionManager.defineOrigin.bind(sessionManager);
  api.hasOrigin = sessionManager.hasOrigin.bind(sessionManager);
  // Note: isSessionActive is origin-scoped and exposed on OriginSessionManager only

  // Forward the cleanupThreshold getter (used in tests)
  Object.defineProperty(api, 'cleanupThreshold', {
    get() {
      return sessionManager.cleanupThreshold;
    },
    enumerable: true,
  });

  return api as SessionManager & ((origin: string) => OriginSessionManager);
};

export { createSessionManager, createDatabaseProvider };
