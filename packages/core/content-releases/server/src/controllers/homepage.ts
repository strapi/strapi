import type { Core } from '@strapi/types';
import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const homepageController = () => {
  const homepageService = strapi.plugin('content-releases').service('homepage');

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response> {
      return { data: await homepageService.getUpcomingReleases() };
    },
  } satisfies Core.Controller;
};

export default homepageController;
