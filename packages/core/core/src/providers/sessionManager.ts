import { defineProvider } from './provider';
import { createSessionManager } from '../services/session-manager';

interface AdminAuthConfig {
  secret?: string;
  options?: Record<string, unknown>;
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

    const config = {
      jwtSecret,
      refreshTokenLifespan: 30 * 24 * 60 * 60, // 30 days in seconds
      accessTokenLifespan: 60 * 60, // 1 hour in seconds
    };

    strapi.add('sessionManager', () =>
      createSessionManager({
        db: strapi.db,
        config,
      })
    );
  },
});
