import { pick } from 'lodash/fp';
import type { Public, Modules } from '@strapi/types';

const pickSelectionParams = <TUID extends Public.UID.ContentType>(
  data: unknown
): Modules.EntityService.Params.Pick<TUID, 'fields' | 'populate'> => {
  return pick(['fields', 'populate'], data);
};

export { pickSelectionParams };
