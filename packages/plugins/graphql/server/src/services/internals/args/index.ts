import SortArg from './sort';
import publicationStatus from './publication-status';
import hasPublishedVersion from './has-published-version';
import PaginationArg from './pagination';
import type { StrapiContext } from '../../types';

export default (context: StrapiContext) => ({
  SortArg,
  PaginationArg,
  PublicationStatusArg: publicationStatus(context),
  HasPublishedVersionArg: hasPublishedVersion(),
});
