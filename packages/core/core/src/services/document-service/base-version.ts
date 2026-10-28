import { errors } from '@strapi/utils';

/**
 * Version checks belong to draft & publish, where two sessions can edit the same draft.
 * Other content types have no draft row to race over; a baseVersion on those saves is ignored
 * so they keep succeeding the way they did before autosave.
 */
const prepareBaseVersionCheck = (
  hasDraftAndPublish: boolean,
  baseVersion: unknown
): string | null => {
  if (!hasDraftAndPublish || baseVersion === undefined) {
    return null;
  }

  const parsedBaseVersion =
    typeof baseVersion === 'string' && baseVersion.length > 0 ? new Date(baseVersion) : undefined;

  if (
    !parsedBaseVersion ||
    Number.isNaN(parsedBaseVersion.getTime()) ||
    parsedBaseVersion.toISOString() !== baseVersion
  ) {
    throw new errors.ValidationError('baseVersion must be a valid ISO timestamp');
  }

  return baseVersion;
};

const assertBaseVersionCurrent = ({
  expected,
  currentUpdatedAt,
  documentId,
  locale,
}: {
  expected: string;
  currentUpdatedAt: Date | string | null;
  documentId?: string;
  locale?: string | null;
}) => {
  const current = currentUpdatedAt == null ? null : new Date(currentUpdatedAt).toISOString();

  if (current !== expected) {
    throw new errors.ConflictError('The document has changed since it was loaded', {
      documentId,
      locale,
      expected,
      current,
    });
  }
};

export { assertBaseVersionCurrent, prepareBaseVersionCheck };
