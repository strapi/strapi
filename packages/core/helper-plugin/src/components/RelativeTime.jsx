import React from 'react';

import { intervalToDuration, isPast } from 'date-fns';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

/**
 * Displays the relative time between a given timestamp and the current time.
 * You can display a custom message for given time intervals by passing an array of custom intervals.
 *
 * @example
 * ```jsx
 * <caption>Display "last hour" if the timestamp is less than an hour ago</caption>
 * <RelativeTime
 *  timestamp={new Date('2021-01-01')}
 *  customIntervals={[
 *   { unit: 'hours', threshold: 1, text: 'last hour' },
 *  ]}
 * ```
 */
const RelativeTime = ({ timestamp, customIntervals }) => {
  const { formatRelativeTime, formatDate, formatTime } = useIntl();

  const interval = intervalToDuration({
    start: timestamp,
    end: Date.now(),
  });

  const unit = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'].find((intervalUnit) => {
    return interval[intervalUnit] > 0 && Object.keys(interval).includes(intervalUnit);
  });

  const relativeTime = isPast(timestamp) ? -interval[unit] : interval[unit];

  // Display custom text if interval is less than the threshold
  const customInterval = customIntervals.find((custom) => interval[custom.unit] < custom.threshold);

  const displayText = customInterval
    ? customInterval.text
    : formatRelativeTime(relativeTime, unit, { numeric: 'auto' });

  return (
    <time
      dateTime={timestamp.toISOString()}
      title={`${formatDate(timestamp)} ${formatTime(timestamp)}`}
    >
      {displayText}
    </time>
  );
};

RelativeTime.propTypes = {
  timestamp: PropTypes.instanceOf(Date).isRequired,
  customIntervals: PropTypes.arrayOf(
    PropTypes.shape({
      unit: PropTypes.oneOf(['years', 'months', 'days', 'hours', 'minutes', 'seconds']).isRequired,
      text: PropTypes.string.isRequired,
      threshold: PropTypes.number.isRequired,
    })
  ),
};

RelativeTime.defaultProps = {
  customIntervals: [],
};

export { RelativeTime };
