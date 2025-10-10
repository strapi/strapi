import associationResolvers from './association';
import queriesResolvers from './query';
import componentResolvers from './component';
import dynamicZoneResolvers from './dynamic-zone';
import paginationResolvers from './pagination';

import type { Context } from '../../types';

export default (context: Context) => ({
  // Generics
  ...associationResolvers(context),

  // Builders
  ...queriesResolvers(context),
  ...componentResolvers(context),
  ...dynamicZoneResolvers(context),
  ...paginationResolvers(context),
});
