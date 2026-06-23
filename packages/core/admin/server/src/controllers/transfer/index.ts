import fp from 'lodash/fp.js';
import runner from './runner';
import token from './token';

const { mapKeys } = fp;

const prefixActionsName = (prefix: string, dict: any) => mapKeys((key) => `${prefix}-${key}`, dict);

export default {
  ...prefixActionsName('runner', runner),
  ...prefixActionsName('token', token),
};
