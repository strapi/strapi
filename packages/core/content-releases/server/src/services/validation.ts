import { errors } from '@strapi/utils';
import { LoadedStrapi } from '@strapi/types';
import { Release, ReleaseActionCreateArgs } from '../../../shared/types';
import { RELEASE_MODEL_UID } from '../constants';

const createReleaseValidationService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async validateUniqueEntry(releaseActionArgs: ReleaseActionCreateArgs) {
    /**
     * Asserting the type, otherwise TS complains: 'release.actions' is of type 'unknown', even though the types come through for non-populated fields...
     * Possibly related to the comment on GetValues: https://github.com/strapi/strapi/blob/main/packages/core/types/src/modules/entity-service/result.ts
     */
    const release = (await strapi.entityService.findOne(
      RELEASE_MODEL_UID,
      releaseActionArgs.releaseId,
      {
        populate: { actions: { populate: { entry: { fields: ['id'] } } } },
      }
    )) as Release | null;

    if (!release) {
      throw new errors.ValidationError(`No release found for id ${releaseActionArgs.releaseId}`);
    }

    const isEntryInRelease = release.actions.some(
      (action) =>
        action.entry.id === releaseActionArgs.entry.id &&
        action.contentType === releaseActionArgs.entry.contentType
    );

    if (isEntryInRelease) {
      throw new errors.ValidationError(
        `Entry with id ${releaseActionArgs.entry.id} and contentType ${releaseActionArgs.entry.contentType} already exists in release with id ${releaseActionArgs.releaseId}`
      );
    }
  },
  validateEntryContentType(releaseActionArgs: ReleaseActionCreateArgs) {
    const contentType = strapi.contentType(releaseActionArgs.entry.contentType);

    if (!contentType) {
      throw new errors.ValidationError(
        `No content type found for uid ${releaseActionArgs.entry.contentType}`
      );
    }

    // TODO: V5 migration - All contentType will have draftAndPublish enabled
    if (!contentType.options?.draftAndPublish) {
      throw new errors.ValidationError(
        `Content type with uid ${releaseActionArgs.entry.contentType} does not have draftAndPublish enabled`
      );
    }
  },
});

export default createReleaseValidationService;
