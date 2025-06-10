import type { ContentType } from '../types';

export const isAllowedContentTypesForRelations = (
  contentType: Partial<Pick<ContentType, 'kind' | 'restrictRelationsTo'>>
) => {
  return (
    contentType.kind === 'collectionType' &&
    (contentType.restrictRelationsTo === null ||
      (Array.isArray(contentType.restrictRelationsTo) &&
        contentType.restrictRelationsTo.length > 0))
  );
};
