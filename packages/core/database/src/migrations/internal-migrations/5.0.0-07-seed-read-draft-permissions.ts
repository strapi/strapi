import { contentTypes as contentTypeUtils } from '@strapi/utils';

import type { Database } from '../..';
import type { Migration } from '../common';

const API_TOKEN_TYPE_CUSTOM = 'custom';

const UP_PERMISSION_UID = 'plugin::users-permissions.permission';
const API_TOKEN_PERMISSION_UID = 'admin::api-token-permission';

type UpPermissionRow = {
  action: string;
  role: number | { id: number } | null;
};

/**
 * Seed `readDraft` content-API permission rows for users-permissions roles and custom API tokens
 * wherever `find` / `findOne` already exists for a draft & publish content type, so behaviour is
 * non-breaking after upgrade. Recorded in `strapi_migrations_internal` (runs once per environment).
 */
export const seedReadDraftPermissions: Migration = {
  name: '5.0.0-07-seed-read-draft-permissions',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- MigrationFn supplies transaction; entity queries use `db`
  async up(_knex, db: Database) {
    if (typeof strapi === 'undefined') {
      return;
    }

    if (db.metadata.has(UP_PERMISSION_UID)) {
      const existing = (await db.query(UP_PERMISSION_UID).findMany()) as UpPermissionRow[];
      const seen = new Set(
        existing.map((p: UpPermissionRow) => {
          const roleId =
            typeof p.role === 'object' && p.role !== null ? (p.role as { id: number }).id : p.role;
          return `${p.action}@${roleId}`;
        })
      );

      for (const p of existing) {
        const m = p.action.match(/^(.+)\.(find|findOne)$/);
        if (!m) {
          continue;
        }
        const baseUid = m[1];
        const model = strapi.getModel(baseUid);
        if (!model || !contentTypeUtils.hasDraftAndPublish(model)) {
          continue;
        }

        const readDraftAction = `${baseUid}.readDraft`;
        const roleId =
          typeof p.role === 'object' && p.role !== null ? (p.role as { id: number }).id : p.role;
        const key = `${readDraftAction}@${roleId}`;
        if (seen.has(key)) {
          continue;
        }

        await db.query(UP_PERMISSION_UID).create({
          data: { action: readDraftAction, role: roleId },
        });
        seen.add(key);
      }
    }

    if (db.metadata.has(API_TOKEN_PERMISSION_UID)) {
      const rows = await db.query(API_TOKEN_PERMISSION_UID).findMany({
        populate: ['token'],
      });
      const seen = new Set(
        rows.map((p: { action: string; token?: { id: number } | null }) => {
          const tid = p.token && typeof p.token === 'object' ? p.token.id : p.token;
          return `${p.action}@${tid}`;
        })
      );

      for (const p of rows) {
        const token = p.token as { id: number; type?: string } | null | undefined;
        if (!token || token.type !== API_TOKEN_TYPE_CUSTOM) {
          continue;
        }

        const m = p.action.match(/^(.+)\.(find|findOne)$/);
        if (!m) {
          continue;
        }
        const baseUid = m[1];
        const model = strapi.getModel(baseUid);
        if (!model || !contentTypeUtils.hasDraftAndPublish(model)) {
          continue;
        }

        const readDraftAction = `${baseUid}.readDraft`;
        const key = `${readDraftAction}@${token.id}`;
        if (seen.has(key)) {
          continue;
        }

        await db.query(API_TOKEN_PERMISSION_UID).create({
          data: { action: readDraftAction, token: token.id },
        });
        seen.add(key);
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
