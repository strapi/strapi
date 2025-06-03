import SortArg from './sort';
import publicationStatus from './publication-status';
import PaginationArg from './pagination';
import type { Context } from '../../types';

export default (context: Context) => ({
  SortArg,
  PaginationArg,
  PublicationStatusArg: publicationStatus(context),
});
