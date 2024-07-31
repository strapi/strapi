import associationResolvers from './association';
import queriesResolvers from './query';
import mutationsResolvers from './mutation';
import componentResolvers from './component';
import dynamicZoneResolvers from './dynamic-zone';

import type { Context } from '../../types';

export default (context: Context) => ({
  // Generics
  ...associationResolvers(context),

  // Builders
  ...mutationsResolvers(context),
  ...queriesResolvers(context),
  ...componentResolvers(context),
  ...dynamicZoneResolvers(context),
});
