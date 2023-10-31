import createCollectionTypeMutationsBuilder from './collection-type';
import createSingleTypeMutationsBuilder from './single-type';
import type { Context } from '../../types';

export default (context: Context) => ({
  ...createCollectionTypeMutationsBuilder(context),
  ...createSingleTypeMutationsBuilder(context),
});
