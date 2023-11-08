import mappers from './mappers';
import attributes from './attributes';
import naming from './naming';

import type { Context } from '../types';

export default (context: Context) => ({
  naming: naming(context),
  attributes: attributes(context),
  mappers: mappers(context),
});
