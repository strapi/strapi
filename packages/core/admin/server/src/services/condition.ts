import fp from 'lodash/fp.js';
import { getService } from '../utils';

const { isString } = fp;

const isValidCondition = (condition: unknown) => {
  const { conditionProvider } = getService('permission');

  return isString(condition) && conditionProvider.has(condition);
};

export { isValidCondition };
