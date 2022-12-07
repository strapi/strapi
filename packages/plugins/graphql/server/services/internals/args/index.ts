import { StrapiCTX } from '../../../types/strapi-ctx';
import SortArg from './sort';
import publicationState from './publication-state';
import PaginationArg from './pagination';

export default (context: StrapiCTX) => ({
  SortArg: (t: any) => SortArg(t),
  PaginationArg: (t: any) => PaginationArg(t),
  PublicationStateArg: (t: any) => publicationState(context, t),
});
