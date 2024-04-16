import { pick } from 'lodash/fp';
import type { UID, Modules } from '@strapi/types';

const pickSelectionParams = <TUID extends UID.ContentType>(
  data: unknown
): Modules.Documents.Params.Pick<TUID, 'fields' | 'populate' | 'status'> => {
  return pick(['fields', 'populate', 'status'], data);
};

export { pickSelectionParams };
