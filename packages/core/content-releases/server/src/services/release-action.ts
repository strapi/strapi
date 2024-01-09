import type { LoadedStrapi } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID } from '../constants';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';

const createReleaseActionService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async deleteManyForContentType(contentTypeUid: ReleaseAction['contentType']) {
    const actionsToDelete = (await strapi.entityService.findMany(RELEASE_ACTION_MODEL_UID, {
      filters: {
        contentType: contentTypeUid,
      },
    })) as unknown as ReleaseAction[];

    return strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
      where: {
        id: { $in: actionsToDelete.map((action) => action.id) },
      },
    });
  },
});

export default createReleaseActionService;
