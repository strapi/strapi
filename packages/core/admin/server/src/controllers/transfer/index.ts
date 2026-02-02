import { mapKeys } from 'lodash/fp';
import runner from './runner';
import token from './token';

const prefixActionsName = (prefix: string, dict: any) => mapKeys((key) => `${prefix}-${key}`, dict);

export default {
  ...prefixActionsName('runner', runner),
  ...prefixActionsName('token', token),
};
