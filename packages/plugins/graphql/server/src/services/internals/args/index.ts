import SortArg from './sort';
import publicationStatus from './publication-status';
import hasPublishedVersion from './has-published-version';
import PaginationArg from './pagination';
import type { Context } from '../../types';

export default (context: Context) => ({
  SortArg,
  PaginationArg,
  PublicationStatusArg: publicationStatus(context),
  HasPublishedVersionArg: hasPublishedVersion(),
});
