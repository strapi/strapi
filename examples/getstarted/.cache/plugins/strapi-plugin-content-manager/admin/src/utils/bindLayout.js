import { isPlainObject, isFunction } from 'lodash';

export const bindLayout = function (object) {
  return Object.keys(object).reduce((acc, current) => {
    if (isPlainObject(object[current])) {
      acc[current] = bindLayout.call(this, object[current]);
    } else if (isFunction(object[current])) {
      acc[current] = object[current].bind(this);
    } else {
      acc[current] = object[current];
    }

    return acc;
  }, {});
};
