import { resolvePostSyncMigrationsDir } from '../file-migration-provider';

import type { Database } from '../..';

describe('post-sync migrations', () => {
  describe('resolvePostSyncMigrationsDir', () => {
    it('uses configured postDir when set', () => {
      const db = {
        config: {
          settings: {
            migrations: {
              dir: '/app/database/migrations',
              postDir: '/app/custom/post',
            },
          },
        },
      } as Database;

      expect(resolvePostSyncMigrationsDir(db)).toBe('/app/custom/post');
    });

    it('derives postDir from pre-sync dir when not configured', () => {
      const db = {
        config: {
          settings: {
            migrations: {
              dir: '/app/database/migrations',
            },
          },
        },
      } as Database;

      expect(resolvePostSyncMigrationsDir(db)).toBe('/app/database/migrations-post');
    });
  });
});
