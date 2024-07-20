import { errors } from '@strapi/utils';
import { LoadedStrapi } from '@strapi/types';
import EE from '@strapi/strapi/dist/utils/ee';
import type { Release, CreateRelease, UpdateRelease } from '../../../shared/contracts/releases';
import type { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import { RELEASE_MODEL_UID } from '../constants';

export class AlreadyOnReleaseError extends errors.ApplicationError<'AlreadyOnReleaseError'> {
  constructor(message: string) {
    super(message);
    this.name = 'AlreadyOnReleaseError';
  }
}

const createReleaseValidationService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async validateUniqueEntry(
    releaseId: CreateReleaseAction.Request['params']['releaseId'],
    releaseActionArgs: CreateReleaseAction.Request['body']
  ) {
    /**
     * Asserting the type, otherwise TS complains: 'release.actions' is of type 'unknown', even though the types come through for non-populated fields...
     * Possibly related to the comment on GetValues: https://github.com/strapi/strapi/blob/main/packages/core/types/src/modules/entity-service/result.ts
     */
    const release = (await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId, {
      populate: { actions: { populate: { entry: { fields: ['id'] } } } },
    })) as Release | null;

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    const isEntryInRelease = release.actions.some(
      (action) =>
        Number(action.entry.id) === Number(releaseActionArgs.entry.id) &&
        action.contentType === releaseActionArgs.entry.contentType
    );

    if (isEntryInRelease) {
      throw new AlreadyOnReleaseError(
        `Entry with id ${releaseActionArgs.entry.id} and contentType ${releaseActionArgs.entry.contentType} already exists in release with id ${releaseId}`
      );
    }
  },
  validateEntryContentType(
    contentTypeUid: CreateReleaseAction.Request['body']['entry']['contentType']
  ) {
    const contentType = strapi.contentType(contentTypeUid);

    if (!contentType) {
      throw new errors.NotFoundError(`No content type found for uid ${contentTypeUid}`);
    }

    // TODO: V5 migration - All contentType will have draftAndPublish enabled
    if (!contentType.options?.draftAndPublish) {
      throw new errors.ValidationError(
        `Content type with uid ${contentTypeUid} does not have draftAndPublish enabled`
      );
    }
  },
  async validatePendingReleasesLimit() {
    // Use the maximum releases option if it exists, otherwise default to 3
    const maximumPendingReleases =
      // @ts-expect-error - options is not typed into features
      EE.features.get('cms-content-releases')?.options?.maximumReleases || 3;

    const [, pendingReleasesCount] = await strapi.db.query(RELEASE_MODEL_UID).findWithCount({
      filters: {
        releasedAt: {
          $null: true,
        },
      },
    });

    // Unlimited is a number that will never be reached like 9999
    if (pendingReleasesCount >= maximumPendingReleases) {
      throw new errors.ValidationError('You have reached the maximum number of pending releases');
    }
  },
  async validateUniqueNameForPendingRelease(
    name: CreateRelease.Request['body']['name'],
    id?: UpdateRelease.Request['params']['id']
  ) {
    const pendingReleases = (await strapi.entityService.findMany(RELEASE_MODEL_UID, {
      filters: {
        releasedAt: {
          $null: true,
        },
        name,
        ...(id && { id: { $ne: id } }),
      },
    })) as Release[];

    const isNameUnique = pendingReleases.length === 0;

    if (!isNameUnique) {
      throw new errors.ValidationError(`Release with name ${name} already exists`);
    }
  },
  async validateScheduledAtIsLaterThanNow(
    scheduledAt: CreateRelease.Request['body']['scheduledAt']
  ) {
    if (scheduledAt && new Date(scheduledAt) <= new Date()) {
      throw new errors.ValidationError('Scheduled at must be later than now');
    }
  },
});

export default createReleaseValidationService;
