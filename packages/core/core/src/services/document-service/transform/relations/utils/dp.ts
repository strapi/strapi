import { isNil } from 'lodash/fp';

import { contentTypes } from '@strapi/utils';
import { Common } from '@strapi/types';

import { LongHandDocument } from './types';

export const getRelationTargetStatus = (
  relation: Pick<LongHandDocument, 'documentId' | 'status'>,
  opts: {
    targetUid: Common.UID.Schema;
    sourceUid: Common.UID.Schema;
    sourceStatus?: boolean;
  }
) => {
  // Ignore if the target content type does not have draft and publish enabled
  const targetContentType = strapi.getModel(opts.targetUid);
  if (!contentTypes.hasDraftAndPublish(targetContentType)) {
    return false;
  }

  // priority: 'relation status' -> 'source status' -> 'draft'
  if (relation.status) {
    return relation.status === 'draft';
  }

  if (!isNil(opts.sourceStatus)) {
    return opts.sourceStatus;
  }

  return true;
};
