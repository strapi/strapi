import { getService } from '../utils';

export default {
  async getKeyStatistics(): Promise<{
    data: Awaited<ReturnType<typeof homepageService.getKeyStatistics>>;
  }> {
    const homepageService = getService('homepage');
    return { data: await homepageService.getKeyStatistics() };
  },
};
