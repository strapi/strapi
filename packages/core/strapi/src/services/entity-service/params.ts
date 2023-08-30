import { pick } from 'lodash/fp';

import type { Common } from '../../types';
import type { Params } from './types';

const pickSelectionParams = <T extends Params.Pick<Common.UID.ContentType, 'fields' | 'populate'>>(
  data: T
): Pick<T, 'fields' | 'populate'> => pick(['fields', 'populate'])(data);

export { pickSelectionParams };
