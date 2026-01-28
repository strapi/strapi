import type { Core } from '@strapi/types';
import { defineProvider } from './provider';
import { createSessionManager } from '../services/session-manager';

export default defineProvider({
  init(strapi) {
    strapi.add('sessionManager', () =>
      createSessionManager({
        db: strapi.db,
      })
    );
  },

  async register(strapi) {
    // Get JWT secret from admin auth settings (same as admin token service)
    const adminAuth = strapi.config.get<Core.Config.Admin['auth']>('admin.auth');
    const jwtSecret = adminAuth?.secret;

    if (!jwtSecret) {
      throw new Error(
        'Missing admin.auth.secret configuration. The SessionManager requires a JWT secret'
      );
    }
  },
});
