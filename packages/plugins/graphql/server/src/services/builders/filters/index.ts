import contentType from './content-type';
import type { Context } from '../../types';

export default (context: Context) => ({
  ...contentType(context),
});
