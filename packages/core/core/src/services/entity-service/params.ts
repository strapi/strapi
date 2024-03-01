import { pick } from 'lodash/fp';
import type { UID, Modules } from '@strapi/types';

const pickSelectionParams = <TUID extends UID.ContentType>(
  data: unknown
): Modules.EntityService.Params.Pick<TUID, 'fields' | 'populate'> => {
  return pick(['fields', 'populate'], data);
};

export { pickSelectionParams };
