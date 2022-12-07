import { StrapiCTX } from '../../../types/strapi-ctx';
import getEnabledScalars from './get-enabled-scalars';

export default (context: StrapiCTX) => ({
  getEnabledScalars: getEnabledScalars(context),
});
