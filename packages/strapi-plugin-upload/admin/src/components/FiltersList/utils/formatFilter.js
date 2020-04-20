import moment from 'moment';
import { dateFormats, dateToUtcTime } from 'strapi-helper-plugin';
import { formatBytes } from '../../../utils';

const formatFilter = filterToFormat => {
  const { name, filter, value } = filterToFormat;

  // Size filter - Convert bites to human-readable format
  if (name === 'size') {
    return {
      ...filterToFormat,
      value: formatBytes(value),
    };
  }

  // Mime filter - Display different wording than the received ones
  if (name === 'mime') {
    return {
      ...filterToFormat,
      name: 'type',
      filter: filter === '_contains' ? '=' : '_ne',
    };
  }

  // Format date to readable format
  if (moment(value)._isValid === true) {
    return {
      ...filterToFormat,
      value: dateToUtcTime(value).format(dateFormats.datetime),
    };
  }

  return filterToFormat;
};

export default formatFilter;
