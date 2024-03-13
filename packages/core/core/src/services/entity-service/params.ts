import { pick } from 'lodash/fp';
import type { Common, Documents } from '@strapi/types';

const pickSelectionParams = <TUID extends Common.UID.ContentType>(
  data: unknown
): Documents.Params.Pick<TUID, 'fields' | 'populate' | 'status'> => {
  return pick(['fields', 'populate', 'status'], data);
};

export { pickSelectionParams };
