import { pick } from 'lodash/fp';

import type { Common } from '../../types';
import type { Params } from './types';

const pickSelectionParams = <TUID extends Common.UID.ContentType>(
  data: unknown
): Params.Pick<TUID, 'fields' | 'populate'> => {
  return pick(['fields', 'populate'], data);
};

export { pickSelectionParams };
