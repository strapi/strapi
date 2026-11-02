import { isString } from 'lodash';

import { getService } from '../utils';

const isValidCondition = (condition: unknown) => {
  const { conditionProvider } = getService('permission');

  return isString(condition) && conditionProvider.has(condition);
};

export { isValidCondition };
