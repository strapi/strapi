import type { Context } from 'koa';
import { getService } from '../utils';
import validateComponentCategory from './validation/component-category';

export default {
  async editCategory(ctx: Context) {
    const body = ctx.request.body as any;

    try {
      await validateComponentCategory(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const { name } = ctx.params;

    strapi.reload.isWatching = false;

    const componentCategoryService = getService('component-categories');

    try {
      const newName = await componentCategoryService.editCategory(name, body);

      setImmediate(() => strapi.reload());

      ctx.send({ name: newName });
    } catch (error) {
      // The server will not restart, so hand file changes back to the watcher
      strapi.reload.resumeWatching();
      throw error;
    }
  },

  async deleteCategory(ctx: Context) {
    const { name } = ctx.params;

    strapi.reload.isWatching = false;

    const componentCategoryService = getService('component-categories');

    try {
      await componentCategoryService.deleteCategory(name);

      setImmediate(() => strapi.reload());

      ctx.send({ name });
    } catch (error) {
      // The server will not restart, so hand file changes back to the watcher
      strapi.reload.resumeWatching();
      throw error;
    }
  },
};
