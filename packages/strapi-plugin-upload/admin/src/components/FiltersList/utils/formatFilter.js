import moment from 'moment';
import { dateFormats, dateToUtcTime } from 'strapi-helper-plugin';

const formatFilter = filterToFormat => {
  const { name, filter, value } = filterToFormat;

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
