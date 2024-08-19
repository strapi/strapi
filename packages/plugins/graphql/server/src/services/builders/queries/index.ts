import createCollectionTypeQueriesBuilder from './collection-type';
import createSingleTypeQueriesBuilder from './single-type';
import type { Context } from '../../types';

export default (context: Context) => ({
  ...createCollectionTypeQueriesBuilder(context),
  ...createSingleTypeQueriesBuilder(context),
});
