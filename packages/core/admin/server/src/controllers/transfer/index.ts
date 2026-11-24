import { mapKeys } from 'lodash';
import runner from './runner';
import token from './token';

const prefixActionsName = (prefix: string, dict: any) =>
  mapKeys(dict, (_value, key) => `${prefix}-${key}`);

export default {
  ...prefixActionsName('runner', runner),
  ...prefixActionsName('token', token),
};
