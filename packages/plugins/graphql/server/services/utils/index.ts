import { StrapiCTX } from '../../types/strapi-ctx';

import mappers from './mappers';
import attributes from './attributes';
import naming from './naming';

export default (context: StrapiCTX) => ({
  naming: naming(context),
  attributes: attributes(context),
  mappers: mappers(context),
});
