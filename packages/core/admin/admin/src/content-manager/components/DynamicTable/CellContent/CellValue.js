import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import toString from 'lodash/toString';
import parseISO from 'date-fns/parseISO';
import { getNumberOfDecimals } from './utils/getNumberOfDecimals';

const CellValue = ({ type, value }) => {
  const { formatDate, formatTime, formatNumber } = useIntl();
  let formattedValue = value;

  if (type === 'date') {
    formattedValue = formatDate(parseISO(value), { dateStyle: 'full' });
  }

  if (type === 'datetime') {
    formattedValue = formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
  }

  if (type === 'time') {
    const [hour, minute, second] = value.split(':');
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(second);

    formattedValue = formatTime(date, {
      numeric: 'auto',
      style: 'short',
    });
  }

  if (['float', 'decimal'].includes(type)) {
    const numberOfDecimals = getNumberOfDecimals(value);

    formattedValue = formatNumber(value, {
      minimumFractionDigits: numberOfDecimals,
      maximumFractionDigits: numberOfDecimals,
    });
  }

  if (['integer', 'biginteger'].includes(type)) {
    formattedValue = formatNumber(value, { maximumFractionDigits: 0 });
  }

  return toString(formattedValue);
};

CellValue.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
};

export default CellValue;
