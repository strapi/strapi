import { isEmpty, isNull, isObject, toLower, toString } from 'lodash';
import moment from 'moment';
import dateFormats from './dateFormats';

const getDisplayedValue = (type, value, name) => {
  switch (toLower(type)) {
    case 'string':
    case 'text':
    case 'email':
    case 'enumeration':
    case 'uid':
      return (value && !isEmpty(toString(value))) || name === 'id' ? toString(value) : '-';
    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal':
      return !isNull(value) ? toString(value) : '-';
    case 'boolean':
      return value !== null ? toString(value) : '-';
    case 'date':
    case 'datetime':
    case 'timestamp': {
      if (value == null) {
        return '-';
      }

      const date =
        value && isObject(value) && value._isAMomentObject === true ? JSON.stringify(value) : value;

      return moment(date).format(dateFormats[type]);
    }
    case 'password':
      return '••••••••';
    case 'media':
    case 'file':
    case 'files':
      return value;
    case 'time': {
      if (!value) {
        return '-';
      }

      const [hour, minute, second] = value.split(':');
      const timeObj = {
        hour,
        minute,
        second,
      };
      const date = moment().set(timeObj);

      return date.format(dateFormats.time);
    }
    case 'relation': {
      return value;
    }
    default:
      return '-';
  }
};

export default getDisplayedValue;
