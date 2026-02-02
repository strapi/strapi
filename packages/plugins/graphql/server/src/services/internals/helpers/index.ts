import getEnabledScalars from './get-enabled-scalars';
import type { Context } from '../../types';

export default (context: Context) => ({
  getEnabledScalars: getEnabledScalars(context),
});
