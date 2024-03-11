import { isNil } from 'lodash/fp';

import { contentTypes } from '@strapi/utils';
import { Common } from '@strapi/types';

import { LongHandDocument } from './types';

type Status = 'draft' | 'published';

export const getRelationTargetStatus = (
  relation: Pick<LongHandDocument, 'documentId' | 'status'>,
  opts: {
    targetUid: Common.UID.Schema;
    sourceUid: Common.UID.Schema;
    sourceStatus?: Status;
  }
): Status[] => {
  // Ignore if the target content type does not have draft and publish enabled
  const targetContentType = strapi.getModel(opts.targetUid);
  const sourceContentType = strapi.getModel(opts.sourceUid);

  const targetHasDP = contentTypes.hasDraftAndPublish(targetContentType);
  const sourceHasDP = contentTypes.hasDraftAndPublish(sourceContentType);

  if (!targetHasDP) {
    return ['published'];
  }

  // priority:
  // DP Enabled 'relation status' -> 'source status' -> 'draft'
  // DP Disabled 'relation status' -> 'draft' and 'published'
  if (relation.status) {
    return [relation.status];
  }

  // Connect to both draft and published versions if dp is disabled and relation does not specify a status
  if (!sourceHasDP) {
    return ['draft', 'published'];
  }

  if (!isNil(opts.sourceStatus)) {
    return [opts.sourceStatus];
  }

  return ['draft'];
};
