import { setCreatorFields } from '@strapi/utils';
import type { LoadedStrapi } from '@strapi/types';
import { RELEASE_MODEL_UID } from '../constants';
import type { ReleaseCreateArgs, UserInfo } from '../types';

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async create(releaseData: ReleaseCreateArgs, { user }: { user: UserInfo }) {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    const release = await strapi.entityService.create(RELEASE_MODEL_UID, {
      data: releaseWithCreatorFields,
    });

    return release;
  },
  async findMany(query: Record<string, unknown>) {
    const { results, pagination } = await strapi.entityService.findPage(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error TS error on populate, is not considering count
          count: true,
        },
      },
    });

    return {
      data: results,
      pagination,
    };
  },
});

export default createReleaseService;
