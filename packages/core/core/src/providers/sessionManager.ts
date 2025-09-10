import type { Algorithm } from 'jsonwebtoken';
import { defineProvider } from './provider';
import { createSessionManager } from '../services/session-manager';

interface AdminAuthConfig {
  secret?: string;
  options?: {
    algorithm?: Algorithm;
    [key: string]: unknown;
  };
}

export default defineProvider({
  init(strapi) {
    // Get JWT secret from admin auth settings (same as admin token service)
    const adminAuth = strapi.config.get<AdminAuthConfig>('admin.auth', {});
    const jwtSecret = adminAuth.secret;

    if (!jwtSecret) {
      throw new Error(
        'Missing admin.auth.secret configuration. The SessionManager requires a JWT secret'
      );
    }

    const accessTokenLifespan = strapi.config.get<number>(
      'admin.auth.sessions.accessTokenLifespan',
      30 * 60
    );
    const maxRefreshTokenLifespan = strapi.config.get<number>(
      'admin.auth.sessions.maxRefreshTokenLifespan',
      30 * 24 * 60 * 60
    );
    const idleRefreshTokenLifespan = strapi.config.get<number>(
      'admin.auth.sessions.idleRefreshTokenLifespan',
      7 * 24 * 60 * 60
    );
    const maxSessionLifespan = strapi.config.get<number>(
      'admin.auth.sessions.maxSessionLifespan',
      7 * 24 * 60 * 60
    );
    const idleSessionLifespan = strapi.config.get<number>(
      'admin.auth.sessions.idleSessionLifespan',
      60 * 60
    );

    const config = {
      jwtSecret,
      accessTokenLifespan,
      maxRefreshTokenLifespan,
      idleRefreshTokenLifespan,
      maxSessionLifespan,
      idleSessionLifespan,
      algorithm: adminAuth.options?.algorithm,
    };

    strapi.add('sessionManager', () =>
      createSessionManager({
        db: strapi.db,
        config,
      })
    );
  },
});
