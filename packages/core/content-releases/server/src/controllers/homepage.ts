import type { Core } from '@strapi/types';
import type { GetUpcomingReleases } from '../../../shared/contracts/homepage';

const homepageController = (() => {
  // The controller only exists with the `cms-content-releases` feature, where the service is defined.
  const homepageService = strapi
    .plugin('content-releases')
    .service<NonNullable<Core.ServiceFor<'plugin::content-releases.homepage'>>>('homepage');

  return {
    async getUpcomingReleases(): Promise<GetUpcomingReleases.Response> {
      return { data: await homepageService.getUpcomingReleases() };
    },
  } satisfies Core.Controller;
}) satisfies Core.ControllerFactory<'plugin::content-releases.homepage'>;

export default homepageController;
