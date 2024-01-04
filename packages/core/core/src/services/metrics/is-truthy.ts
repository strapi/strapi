import _ from 'lodash';

const isTruthy = (val: any) => {
  return [1, true].includes(val) || ['true', '1'].includes(_.toLower(val));
};

export default isTruthy;
