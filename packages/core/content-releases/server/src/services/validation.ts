import { errors, contentTypes } from '@strapi/utils';
import { Core, UID } from '@strapi/types';
import type { Release, CreateRelease, UpdateRelease } from '../../../shared/contracts/releases';
import type { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import { RELEASE_MODEL_UID } from '../constants';

export class AlreadyOnReleaseError extends errors.ApplicationError<'AlreadyOnReleaseError'> {
  constructor(message: string) {
    super(message);
    this.name = 'AlreadyOnReleaseError';
  }
}

const createReleaseValidationService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async validateUniqueEntry(
    releaseId: CreateReleaseAction.Request['params']['releaseId'],
    releaseActionArgs: CreateReleaseAction.Request['body']
  ) {
    /**
     * Asserting the type, otherwise TS complains: 'release.actions' is of type 'unknown', even though the types come through for non-populated fields...
     * Possibly related to the comment on GetValues: https://github.com/strapi/strapi/blob/main/packages/core/types/src/modules/entity-service/result.ts
     */
    const release = (await strapi.db.query(RELEASE_MODEL_UID).findOne({
      where: {
        id: releaseId,
      },
      populate: {
        actions: true,
      },
    })) as Release | null;

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    const isEntryInRelease = release.actions.some(
      (action) =>
        action.entryDocumentId === releaseActionArgs.entryDocumentId &&
        action.contentType === releaseActionArgs.contentType &&
        (releaseActionArgs.locale ? action.locale === releaseActionArgs.locale : true)
    );

    if (isEntryInRelease) {
      throw new AlreadyOnReleaseError(
        `Entry with documentId ${releaseActionArgs.entryDocumentId}${releaseActionArgs.locale ? `( ${releaseActionArgs.locale})` : ''} and contentType ${releaseActionArgs.contentType} already exists in release with id ${releaseId}`
      );
    }
  },
  validateEntryData(
    contentTypeUid: CreateReleaseAction.Request['body']['contentType'],
    entryDocumentId: CreateReleaseAction.Request['body']['entryDocumentId']
  ) {
    const contentType = strapi.contentType(contentTypeUid as UID.ContentType);

    if (!contentType) {
      throw new errors.NotFoundError(`No content type found for uid ${contentTypeUid}`);
    }

    if (!contentTypes.hasDraftAndPublish(contentType)) {
      throw new errors.ValidationError(
        `Content type with uid ${contentTypeUid} does not have draftAndPublish enabled`
      );
    }

    if (contentType.kind === 'collectionType' && !entryDocumentId) {
      throw new errors.ValidationError('Document id is required for collection type');
    }
  },
  async validatePendingReleasesLimit() {
    // Use the maximum releases option if it exists, otherwise default to 3
    const featureCfg = strapi.ee.features.get('cms-content-releases');

    const maximumPendingReleases =
      (typeof featureCfg === 'object' && featureCfg?.options?.maximumReleases) || 3;

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
    const pendingReleases = (await strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
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
