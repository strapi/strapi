import associationResolvers from './association';
import queriesResolvers from './query';
import mutationsResolvers from './mutation';
import componentResolvers from './component';
import dynamicZoneResolvers from './dynamic-zone';
import { StrapiCTX } from '../../../types/strapi-ctx';

export default (context: StrapiCTX) => ({
  // Generics
  ...associationResolvers(context),

  // Builders
  ...mutationsResolvers(context),
  ...queriesResolvers(context),
  ...componentResolvers(context),
  ...dynamicZoneResolvers(context),
});
