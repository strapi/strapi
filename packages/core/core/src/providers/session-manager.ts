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
});
