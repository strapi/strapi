import { pick } from 'lodash/fp';
import type { Common, EntityService } from '@strapi/types';

const pickSelectionParams = <TUID extends Common.UID.ContentType>(
  data: unknown
): EntityService.Params.Pick<TUID, 'fields' | 'populate'> => {
  return pick(['fields', 'populate'], data);
};

export { pickSelectionParams };
