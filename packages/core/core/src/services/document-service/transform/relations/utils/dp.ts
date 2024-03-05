import { contentTypes } from '@strapi/utils';
import { Common } from '@strapi/types';

import { LongHandDocument } from './types';

export const getRelationTargetStatus = (
  relation: LongHandDocument,
  opts: {
    targetUid: Common.UID.Schema;
    sourceUid: Common.UID.Schema;
    sourceStatus?: boolean;
  }
) => {
  const contentType = strapi.getModel(opts.targetUid);

  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return false;
  }

  return opts.sourceStatus;
};
