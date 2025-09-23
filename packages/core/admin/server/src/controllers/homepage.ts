import type { Context } from 'koa';
import { getService } from '../utils';
import { HomepageLayout, HomepageLayoutWrite } from './validation/schema';

export default {
  async getKeyStatistics(): Promise<{
    data: Awaited<ReturnType<typeof homepageService.getKeyStatistics>>;
  }> {
    const homepageService = getService('homepage');
    return { data: await homepageService.getKeyStatistics() };
  },
  async getHomepageLayout(ctx: Context): Promise<{ data: HomepageLayout | null }> {
    const homepageService = getService('homepage');
    const userId = ctx.state.user?.id;

    const data = await homepageService.getHomepageLayout(userId);
    return { data };
  },
  async updateHomepageLayout(ctx: Context): Promise<{ data: HomepageLayout }> {
    const homepageService = getService('homepage');
    const userId = ctx.state.user?.id;

    const body = ctx.request.body as HomepageLayoutWrite;
    const data = await homepageService.updateHomepageLayout(userId, body);
    return { data };
  },
};
