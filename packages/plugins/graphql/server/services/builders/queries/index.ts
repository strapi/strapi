import { StrapiCTX } from '../../../types/strapi-ctx';
import createCollectionTypeQueriesBuilder from './collection-type';
import createSingleTypeQueriesBuilder from './single-type';

export default (context: StrapiCTX) => ({
  ...createCollectionTypeQueriesBuilder(context),
  ...createSingleTypeQueriesBuilder(context),
});
