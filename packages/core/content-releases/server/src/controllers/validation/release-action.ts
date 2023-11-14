import { yup, validateYupSchema, errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../../constants';
import { Release, ReleaseActionCreateArgs } from '../../types';

const releaseActionCreateSchema = yup.object().shape({
  releaseId: yup.number().required(),
  entry: yup
    .object()
    .shape({
      id: yup.number().required(),
      contentType: yup.string().required(),
    })
    .required(),
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

export const validateReleaseActionCreateSchema = validateYupSchema(releaseActionCreateSchema);

export async function validateUniqueEntryInRelease(releaseActionArgs: ReleaseActionCreateArgs) {
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
    throw new errors.ApplicationError(`No release found for id ${releaseActionArgs.releaseId}`);
  }

  const releaseEntryIds = release.actions.map((action) => action.entry.id);

  if (releaseEntryIds.includes(releaseActionArgs.entry.id)) {
    throw new errors.ApplicationError(
      `Entry with id ${releaseActionArgs.entry.id} already exists in release with id ${releaseActionArgs.releaseId}`
    );
  }
}

export async function validateEntryContentType(releaseActionArgs: ReleaseActionCreateArgs) {
  const contentType = strapi.contentType(releaseActionArgs.entry.contentType);

  if (!contentType) {
    throw new errors.ApplicationError(
      `No content type found for uid ${releaseActionArgs.entry.contentType}`
    );
  }

  if (!contentType.options?.draftAndPublish) {
    throw new errors.ApplicationError(
      `Content type with uid ${releaseActionArgs.entry.contentType} does not have draftAndPublish enabled`
    );
  }
}
