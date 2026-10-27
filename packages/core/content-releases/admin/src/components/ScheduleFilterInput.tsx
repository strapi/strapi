import * as React from 'react';

import { useField, type Filters } from '@strapi/admin/strapi-admin';
import { DatePicker, Flex, TimePicker } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { joinScheduleFilterValue, splitScheduleFilterValue } from '../utils/scheduleFilters';

// The DatePicker reads its value as a UTC calendar day, like the admin's date input
const toPickerDate = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

const toLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * The value of a release date filter: a date, and a time when the user wants to narrow it down
 * to a minute. See `utils/scheduleFilters`.
 */
const ScheduleFilterInput = ({ name, ...props }: Filters.ValueInputProps) => {
  const { formatMessage, locale } = useIntl();
  const field = useField<string>(name);
  const { date, time } = splitScheduleFilterValue(field.value);
  const label = props['aria-label'];
  // The TimePicker lists and parses times in the locale's format (e.g. `10.53`), not `HH:mm`
  const timeFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
    [locale]
  );
  const [hours, minutes] = time?.split(':').map(Number) ?? [];

  const setValue = (nextDate?: Date, nextTime?: string) => {
    field.onChange(name, joinScheduleFilterValue(nextDate, nextTime));
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <DatePicker
        aria-label={formatMessage(
          { id: 'content-releases.pages.Releases.filters.date', defaultMessage: '{field} date' },
          { field: label }
        )}
        value={date ? toPickerDate(date) : undefined}
        onChange={(nextDate) => setValue(nextDate ? toLocalDay(nextDate) : undefined, time)}
        onClear={() => setValue()}
        clearLabel={formatMessage(
          {
            id: 'content-releases.pages.Releases.filters.date.clear',
            defaultMessage: 'Clear {field} date',
          },
          { field: label }
        )}
      />
      <TimePicker
        aria-label={formatMessage(
          {
            id: 'content-releases.pages.Releases.filters.time',
            defaultMessage: '{field} time (optional)',
          },
          { field: label }
        )}
        // Without a date there's nothing for the time to narrow down
        disabled={!date}
        // `''`, not `undefined`: the picker would fall back to the last time it kept itself
        value={time ? timeFormatter.format(new Date(0, 0, 0, hours, minutes)) : ''}
        onChange={(nextTime) => setValue(date, nextTime)}
        onClear={() => setValue(date)}
        clearLabel={formatMessage(
          {
            id: 'content-releases.pages.Releases.filters.time.clear',
            defaultMessage: 'Clear {field} time',
          },
          { field: label }
        )}
      />
    </Flex>
  );
};

export { ScheduleFilterInput };
