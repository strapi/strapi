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

    const refreshTokenLifespan = strapi.config.get<number>(
      'admin.auth.sessions.refreshTokenLifespan',
      30 * 24 * 60 * 60
    );
    const accessTokenLifespan = strapi.config.get<number>(
      'admin.auth.sessions.accessTokenLifespan',
      60 * 60
    );

    const config = {
      jwtSecret,
      refreshTokenLifespan,
      accessTokenLifespan,
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
