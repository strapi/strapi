import React from 'react';
import { intervalToDuration, isPast } from 'date-fns';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const RelativeTime = ({ timestamp }) => {
  const { formatRelativeTime, formatDate, formatTime } = useIntl();

  const interval = intervalToDuration({
    start: timestamp,
    end: new Date(),
  });

  const unit = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].find((intervalUnit) => {
    return interval[intervalUnit] > 0 && Object.keys(interval).includes(intervalUnit);
  });

  const relativeTime = isPast(timestamp) ? -interval[unit] : interval[unit];

  return (
    <time
      dateTime={timestamp.toISOString()}
      title={`${formatDate(timestamp)} ${formatTime(timestamp)}`}
    >
      {formatRelativeTime(relativeTime, unit, { numeric: 'auto' })}
    </time>
  );
};

RelativeTime.propTypes = {
  timestamp: PropTypes.instanceOf(Date).isRequired,
};

export default RelativeTime;
