import moment from 'moment';
import { dateFormats } from 'strapi-helper-plugin';

const dateToUtcTime = date => moment.parseZone(date).utc();

const formatFilter = filterToFormat => {
  let formattedFilter = filterToFormat;
  const { name, filter, value } = formattedFilter;

  // Display different wording than the backend
  if (name === 'mime') {
    formattedFilter = {
      ...filterToFormat,
      name: 'type',
      filter: filter === '_contains' ? '=' : '_ne',
    };
  }

  // Format date to readable format
  if (dateToUtcTime(value)._isUTC === true) {
    formattedFilter = {
      ...filterToFormat,
      value: dateToUtcTime(value).format(dateFormats.datetime),
    };
  }

  return formattedFilter;
};

export default formatFilter;
