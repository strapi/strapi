import { isPlainObject, isString, isArray } from 'lodash';

const templateObject = function (obj, variables) {
  // Allow values which looks like such as
  // an ES6 literal string without parenthesis inside (aka function call).
  const regex = /\$\{[\S]*\}/g;
  const replacer = (match) => {
    const key = match.substring(0, match.length - 1).replace('${', '');

    return variables[key];
  };

  return Object.keys(obj).reduce((acc, key) => {
    if (isPlainObject(obj[key]) || isArray(obj[key])) {
      acc[key] = templateObject(obj[key], variables[key]);
    } else if (isString(obj[key]) && regex.test(obj[key])) {
      acc[key] = obj[key].replace(regex, replacer);
    } else {
      acc[key] = variables[obj[key]];
    }

    return acc;
  }, {});
};

export default templateObject;
