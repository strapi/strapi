import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Database } from '@strapi/database';

export interface SessionProvider {
  create(session: SessionData): Promise<SessionData>;
  findBySessionId(sessionId: string): Promise<SessionData | null>;
  findByIdentifier(userId: string): Promise<SessionData[]>;
  deleteBySessionId(sessionId: string): Promise<void>;
  deleteByIdentifier(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export interface SessionData {
  id?: string;
  user: string; // User ID stored as string (key-value store)
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
      where: { user: userId },
    });
    return results as SessionData[];
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.db.query(this.contentType).delete({
      where: { sessionId },
    });
  }

  async deleteByIdentifier(userId: string): Promise<void> {
    await this.db.query(this.contentType).delete({
      where: { user: userId },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.db.query(this.contentType).delete({
      where: { expiresAt: { $lt: new Date() } },
    });
  }
}

export interface SessionManagerConfig {
  jwtSecret: string;
  refreshTokenLifespan: number; // default 30 days
  accessTokenLifespan: number; // default 1 hour
}

class SessionManager {
  private provider: SessionProvider;

  private config: SessionManagerConfig;

  constructor(provider: SessionProvider, config: SessionManagerConfig) {
    this.provider = provider;
    this.config = config;
  }

  generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async generateRefreshToken(
    userId: string,
    deviceId: string,
    origin: string
  ): Promise<{ token: string; sessionId: string }> {
    await this.provider.deleteExpired();

    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.config.refreshTokenLifespan * 1000);

    await this.provider.create({
      user: userId,
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
    });

    return { token, sessionId };
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
