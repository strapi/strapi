import { StrapiCTX } from '../../../types/strapi-ctx';
import contentType from './content-type';

export default (context: StrapiCTX) => ({
  ...contentType(context),
});
