import { Duration, intervalToDuration, isPast } from 'date-fns';
import { useIntl } from 'react-intl';

const intervals: Array<keyof Duration> = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];

interface CustomInterval {
  unit: keyof Duration;
  text: string;
  threshold: number;
}

export interface RelativeTimeProps {
  timestamp: Date;
  customIntervals?: CustomInterval[];
  className?: string;
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
const RelativeTime = ({ timestamp, customIntervals = [], className }: RelativeTimeProps) => {
  const { formatRelativeTime, formatDate, formatTime } = useIntl();

  const interval = intervalToDuration({
    start: timestamp,
    end: Date.now(),
    // see https://github.com/date-fns/date-fns/issues/2891 – No idea why it's all partial it returns it every time.
  }) as Required<Duration>;

  const unit = intervals.find((intervalUnit) => {
    return interval[intervalUnit] > 0 && Object.keys(interval).includes(intervalUnit);
  })!;

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
      className={className}
    >
      {displayText}
    </time>
  );
};

export { RelativeTime };
