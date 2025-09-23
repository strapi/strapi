import type { Context } from 'koa';
import { getService } from '../utils';
import { UserLayout, UserLayoutWrite } from './validation/schema';

export default {
  async getKeyStatistics(): Promise<{
    data: Awaited<ReturnType<typeof homepageService.getKeyStatistics>>;
  }> {
    const homepageService = getService('homepage');
    return { data: await homepageService.getKeyStatistics() };
  },
  async getUserLayout(ctx: Context): Promise<{ data: UserLayout } | null> {
    const homepageService = getService('homepage');
    const userId = ctx.state.user?.id;
    if (!userId) ctx.throw(401, 'Unauthorized');

    const data = await homepageService.getUserLayout(userId);
    if (!data) return null;
    return { data };
  },
  async updateUserLayout(ctx: Context): Promise<{ data: UserLayout }> {
    const homepageService = getService('homepage');
    const userId = ctx.state.user?.id;
    if (!userId) ctx.throw(401, 'Unauthorized');

    const body = ctx.request.body as UserLayoutWrite;
    const data = await homepageService.updateUserLayout(userId, body);
    return { data };
  },
};
