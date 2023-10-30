import { setCreatorFields } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import type { ReleaseData, UserInfo } from '../types';

const create = async (releaseData: ReleaseData, { user }: { user: UserInfo }) => {
  const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

  const release = await strapi.entityService.create(RELEASE_MODEL_UID, {
    data: releaseWithCreatorFields,
  });

  return release;
};

const releaseService = () => ({
  create,
});

export default releaseService;
