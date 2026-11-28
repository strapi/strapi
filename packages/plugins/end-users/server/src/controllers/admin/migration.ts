import type Koa from 'koa';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { PLUGIN_ID } from '../../constants';
import { validateResolved } from '../../validation/migration';
import { runCheck } from '../../migration/check';
import { isCheckMode } from '../../migration/config';
import {
  isDevelopmentServer,
  planProjectFiles,
  publicProjectFiles,
} from '../../migration/files/plan';
import { writeProjectFiles } from '../../migration/files/write';
import type migrationService from '../../services/migration';

/**
 * `/end-users/migration`: the status the Migration section draws, acknowledging an item, the check,
 * and the project files the switch needs.
 */
const migrationController = ({ strapi }: { strapi: Core.Strapi }) => {
  const migration = () =>
    strapi.plugin(PLUGIN_ID).service('migration') as ReturnType<typeof migrationService>;

  return {
    async status(ctx: Koa.Context) {
      ctx.body = { data: await migration().status() };
    },

    async updateItem(ctx: Koa.Context) {
      const resolved = (await validateResolved(ctx.request.body?.resolved)) as boolean;

      ctx.body = { data: await migration().updateItem(ctx.params.id, resolved) };
    },

    /** Reads the Users & Permissions tables and stores the report: only in check mode, or it would replace the real one */
    async check(ctx: Koa.Context) {
      if (!isCheckMode(strapi)) {
        throw new errors.ValidationError(
          'The check runs only when migration.fromUsersPermissions is "check".'
        );
      }

      await runCheck(strapi);

      ctx.body = { data: await migration().status() };
    },

    /** The plan, without the change to `config/plugins`: that file never leaves the server */
    async files(ctx: Koa.Context) {
      ctx.body = { data: publicProjectFiles(await planProjectFiles(strapi)) };
    },

    /**
     * Plans again on the server and writes the schema files and `config/plugins`: no body is read,
     * so what the browser sends can't change what is written. Development only; Strapi restarts
     * on its own once the files change.
     */
    async writeFiles(ctx: Koa.Context) {
      if (!isDevelopmentServer(strapi)) {
        throw new errors.ForbiddenError(
          'The project files are written only by a development server (strapi develop).'
        );
      }

      const plan = await planProjectFiles(strapi);

      if (!plan.writable) {
        ctx.status = 409;
        ctx.body = {
          data: null,
          error: {
            status: 409,
            name: 'ConflictError',
            message: 'The project files cannot be written from here.',
            details: { reason: plan.reason },
          },
        };

        return;
      }

      await writeProjectFiles(strapi.dirs.app.root, [
        ...plan.changes,
        ...(plan.configChange ? [plan.configChange] : []),
      ]);

      ctx.status = 204;
    },
  };
};

export default migrationController;
