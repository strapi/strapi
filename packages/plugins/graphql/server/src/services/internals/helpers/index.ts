import getEnabledScalars from './get-enabled-scalars';
import type { StrapiContext } from '../../types';

export default (context: StrapiContext) => ({
  getEnabledScalars: getEnabledScalars(context),
});
