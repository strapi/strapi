import SortArg from './sort';
import publicationStatus from './publication-status';
import publicationFilterArg from './publication-filter';
import PaginationArg from './pagination';
import type { Context } from '../../types';

export default (context: Context) => ({
  SortArg,
  PaginationArg,
  PublicationStatusArg: publicationStatus(context),
  PublicationFilterArg: publicationFilterArg(context),
});
