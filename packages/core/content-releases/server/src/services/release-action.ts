import type { LoadedStrapi } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID } from '../constants';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';

const createReleaseActionService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async deleteManyForContentType(contentTypeUid: ReleaseAction['contentType']) {
    return strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
      where: {
        target_type: contentTypeUid,
      },
    });
  },
});

export default createReleaseActionService;
