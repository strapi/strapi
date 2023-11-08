import args from './args';
import scalars from './scalars';
import types from './types';
import helpers from './helpers';
import type { Context } from '../types';

export default (context: Context) => ({
  args: args(context),
  scalars: scalars(),
  buildInternalTypes: types(context),
  helpers: helpers(context),
});
