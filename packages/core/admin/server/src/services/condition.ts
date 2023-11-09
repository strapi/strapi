import { isString } from 'lodash/fp';
import { getService } from '../utils';

const isValidCondition = (condition: unknown) => {
  const { conditionProvider } = getService('permission');

  return isString(condition) && conditionProvider.has(condition);
};

export { isValidCondition };
