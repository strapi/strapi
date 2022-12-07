import args from './args';
import scalars from './scalars';
import types from './types';
import helpers from './helpers';
import { StrapiCTX } from '../../types/strapi-ctx';

export default (context: StrapiCTX) => ({
  args: args(context),
  scalars: scalars(),
  buildInternalTypes: types(context),
  helpers: helpers(context),
});
