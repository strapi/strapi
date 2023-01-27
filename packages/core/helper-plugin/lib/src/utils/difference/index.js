import isEqual from 'lodash/isEqual';
import transform from 'lodash/transform';
import isObject from 'lodash/isObject';

function difference(object, base) {
  function changes(object, base) {
    return transform(object, function (result, value, key) {
      if (!isEqual(value, base[key])) {
        result[key] = isObject(value) && isObject(base[key]) ? changes(value, base[key]) : value;
      }
    });
  }

  return changes(object, base);
}

export default difference;
