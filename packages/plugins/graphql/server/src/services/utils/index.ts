import mappers from './mappers';
import attributes from './attributes';
import naming from './naming';
import playground from './playground';

import type { Context } from '../types';

export default (context: Context) => ({
  playground: playground(context),
  naming: naming(context),
  attributes: attributes(context),
  mappers: mappers(context),
});
