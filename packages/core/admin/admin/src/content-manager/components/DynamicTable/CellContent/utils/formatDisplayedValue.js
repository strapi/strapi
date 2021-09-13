const formatDisplayedValue = (value, type, formatters) => {
  let formattedValue = value;

  if (type === 'date') {
    formattedValue = formatters.formatDate(value, { dateStyle: 'full' });
  }

  if (type === 'datetime') {
    formattedValue = formatters.formatDate(value, { dateStyle: 'full', timeStyle: 'short' });
  }

  if (type === 'time') {
    const [hour, minute, second] = value.split(':');
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(second);

    formattedValue = formatters.formatTime(date, {
      numeric: 'auto',
      style: 'short',
    });
  }

  if (['float', 'integer', 'biginteger', 'decimal'].includes(type)) {
    formattedValue = formatters.formatNumber(value);
  }

  return formattedValue;
};

export default formatDisplayedValue;
