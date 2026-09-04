import mappers from './mappers';
import attributes from './attributes';
import naming from './naming';
import playground from './playground';

import type { StrapiContext } from '../types';

export default (context: StrapiContext) => ({
  playground: playground(context),
  naming: naming(context),
  attributes: attributes(context),
  mappers: mappers(context),
});
