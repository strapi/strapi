import React from 'react';

import { intervalToDuration, isPast } from 'date-fns';
import { useIntl } from 'react-intl';

const Intervals = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

type IntervalUnit = (typeof Intervals)[number];

interface CustomInterval {
  unit: IntervalUnit;
  text: string;
  threshold: number;
}

interface RelativeTimeProps {
  timestamp: Date;
  customIntervals?: CustomInterval[];
}

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
const RelativeTime = ({ timestamp, customIntervals = [] }: RelativeTimeProps) => {
  const { formatRelativeTime, formatDate, formatTime } = useIntl();

  const interval = intervalToDuration({
    start: timestamp,
    end: Date.now(),
  });

  const unit: IntervalUnit = Array.from(Intervals).find((intervalUnit) => {
    return interval[intervalUnit]! > 0 && Object.keys(interval).includes(intervalUnit);
  })!;

  const relativeTime: number = isPast(timestamp) ? -interval[unit]! : interval[unit]!;

  // Display custom text if interval is less than the threshold
  const customInterval = customIntervals.find(
    (custom) => interval[custom.unit]! < custom.threshold
  );

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

export { RelativeTime };
