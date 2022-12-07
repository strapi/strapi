import { StrapiCTX } from '../../../types/strapi-ctx';
import createCollectionTypeMutationsBuilder from './collection-type';
import createSingleTypeMutationsBuilder from './single-type';

export default (context: StrapiCTX) => ({
  ...createCollectionTypeMutationsBuilder(context),
  ...createSingleTypeMutationsBuilder(context),
});
