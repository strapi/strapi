import SortArg from './sort';
import publicationState from './publication-state';
import PaginationArg from './pagination';
import type { Context } from '../../types';

export default (context: Context) => ({
  SortArg,
  PaginationArg,
  PublicationStateArg: publicationState(context),
});
