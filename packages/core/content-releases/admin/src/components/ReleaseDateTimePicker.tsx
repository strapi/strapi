import * as React from 'react';

import { Popover } from '@base-ui/react/popover';
import { Field } from '@strapi/design-system';
import { cn } from '@strapi/design-system/next';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useIntl } from 'react-intl';

import { CalendarBlank } from './ScheduleIcons';

/**
 * PROTOTYPE: a single combined date + time picker built on `/next` primitives
 * (@base-ui Popover + Tailwind tokens), replacing the two separate legacy
 * DatePicker / TimePicker fields in the Release drawer.
 *
 * The calendar grid is hand-built on date-fns to avoid adding `react-day-picker`
 * as a plugin dependency. When `/next` grows a proper Calendar/Popover, a dev
 * should promote this there and swap the import.
 *
 * The date and the time are wall-clock strings in the release's timezone. They never go through a
 * `Date` together: a time that doesn't exist in the browser's zone (its DST gap) would shift.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const CaretLeft = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" aria-hidden {...props}>
    <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
  </svg>
);

const CaretRight = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" aria-hidden {...props}>
    <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
  </svg>
);

const ClockIcon = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" aria-hidden {...props}>
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" />
  </svg>
);

const XIcon = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" aria-hidden {...props}>
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);

// `yyyy-MM-dd`, the format the form keeps its date in
const DATE_FORMAT = 'yyyy-MM-dd';
const TIME_PATTERN = /^\d{2}:\d{2}$/;

// The day of a `yyyy-MM-dd` string, at the browser's midnight: only its day is ever read
const toDay = (date: string) => parse(date, DATE_FORMAT, new Date());

const DAY_KEYS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export interface ReleaseDateTimeValue {
  // yyyy-MM-dd
  date: string;
  // HH:mm
  time: string;
}

export interface ReleaseDateTimePickerProps {
  date: string | null;
  time: string;
  onChange: (value: ReleaseDateTimeValue | null) => void;
  minDate?: Date;
  placeholder: string;
  clearLabel: string;
  disabled?: boolean;
  /** Offset shown after the time once a value is picked, e.g. "UTC+01:00" */
  timezoneOffset?: string;
  /** Rendered inside the popover under the time row (e.g. the timezone combobox) */
  timezoneSlot?: React.ReactNode;
}

/**
 * Must render inside a `Field.Root`: its label names the trigger and its error describes it.
 */
export const ReleaseDateTimePicker = ({
  date,
  time,
  onChange,
  minDate,
  placeholder,
  clearLabel,
  disabled = false,
  timezoneSlot,
  timezoneOffset,
}: ReleaseDateTimePickerProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { id, error, required } = Field.useField('ReleaseDateTimePicker');
  const [open, setOpen] = React.useState(false);
  const selectedDay = date ? toDay(date) : undefined;
  const [viewMonth, setViewMonth] = React.useState<Date>(() =>
    startOfMonth(selectedDay ?? minDate ?? new Date())
  );
  // The day arrow keys move from, the one day of the grid in the tab order
  const [focusedDay, setFocusedDay] = React.useState<Date | undefined>(selectedDay);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const shouldFocusDayRef = React.useRef(false);

  // Jump the calendar to the selected day when it changes, e.g. when editing an existing release.
  // Keyed on the string: the month the user navigated to stays on every other render.
  React.useEffect(() => {
    if (date) {
      const day = toDay(date);
      setViewMonth(startOfMonth(day));
      setFocusedDay(day);
    }
  }, [date]);

  const minDay = minDate ? startOfDay(minDate) : undefined;

  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
      }),
    [viewMonth]
  );

  const tabbableDay =
    [focusedDay, selectedDay, new Date()].find((day) => day && isSameMonth(day, viewMonth)) ??
    startOfMonth(viewMonth);

  React.useEffect(() => {
    if (shouldFocusDayRef.current) {
      shouldFocusDayRef.current = false;
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${format(tabbableDay, DATE_FORMAT)}"]`)
        ?.focus();
    }
  });

  const isDayDisabled = (day: Date) => (minDay ? day < minDay : false);

  const handleSelectDay = (day: Date) => {
    if (isDayDisabled(day)) {
      return;
    }

    onChange({ date: format(day, DATE_FORMAT), time: time || '00:00' });
    setFocusedDay(day);
    setViewMonth(startOfMonth(day));
  };

  const handleDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, day: Date) => {
    const delta = DAY_KEYS[event.key];

    if (delta === undefined) {
      return;
    }

    event.preventDefault();
    const next = addDays(day, delta);
    shouldFocusDayRef.current = true;
    setFocusedDay(next);
    if (!isSameMonth(next, viewMonth)) {
      setViewMonth(startOfMonth(next));
    }
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = event.target.value;

    if (!TIME_PATTERN.test(nextTime)) {
      return;
    }

    onChange({ date: date ?? format(minDate ?? new Date(), DATE_FORMAT), time: nextTime });
  };

  const monthLabel = formatDate(viewMonth, { month: 'long', year: 'numeric' });

  return (
    <Popover.Root
      open={open}
      modal={false}
      onOpenChange={(nextOpen, eventDetails) => {
        // The timezone Combobox renders its listbox in a portal outside this popup. Interacting with
        // it (a click, or focus moving into it) reads as "outside" and would close the whole picker,
        // so keep the picker open while that listbox is being clicked or holds focus.
        if (!nextOpen) {
          const ev = eventDetails.event as unknown as {
            target?: EventTarget | null;
            relatedTarget?: EventTarget | null;
          };
          const inListbox = (node: EventTarget | null | undefined) =>
            node instanceof Element && node.closest('[role="listbox"],[role="option"]') !== null;
          if (
            inListbox(ev?.target) ||
            inListbox(ev?.relatedTarget) ||
            inListbox(document.activeElement)
          ) {
            eventDetails.cancel();
            return;
          }
        }
        setOpen(nextOpen);
      }}
    >
      <Popover.Trigger
        id={id}
        role="combobox"
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        aria-required={required}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-sm',
          'shadow-xs outline-none transition-colors',
          'hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'aria-expanded:border-ring',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        <CalendarBlank className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn('flex-1 text-left', !selectedDay && 'text-muted-foreground')}>
          {selectedDay
            ? `${formatDate(selectedDay, { day: 'numeric', month: 'short', year: 'numeric' })}, ${
                time || '00:00'
              }${timezoneOffset ? ` ${timezoneOffset}` : ''}`
            : placeholder}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="left"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-[1000]"
        >
          <Popover.Popup
            className={cn(
              'w-[34rem] max-w-[var(--available-width)] rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none'
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label={formatMessage({
                  id: 'content-releases.release-drawer.date-picker.previous-month',
                  defaultMessage: 'Previous month',
                })}
                onClick={() => setViewMonth((month) => subMonths(month, 1))}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <CaretLeft className="size-4" />
              </button>
              <span className="text-base font-medium" aria-live="polite">
                {monthLabel}
              </span>
              <button
                type="button"
                aria-label={formatMessage({
                  id: 'content-releases.release-drawer.date-picker.next-month',
                  defaultMessage: 'Next month',
                })}
                onClick={() => setViewMonth((month) => addMonths(month, 1))}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <CaretRight className="size-4" />
              </button>
            </div>

            <div
              ref={gridRef}
              role="group"
              aria-label={monthLabel}
              className="grid grid-cols-7 gap-1"
            >
              {days.slice(0, 7).map((day) => (
                <div
                  key={day.getDay()}
                  aria-hidden
                  className="flex h-9 items-center justify-center text-sm font-medium text-muted-foreground"
                >
                  {formatDate(day, { weekday: 'short' })}
                </div>
              ))}
              {days.map((day) => {
                const selected = selectedDay ? isSameDay(day, selectedDay) : false;
                const outside = !isSameMonth(day, viewMonth);
                const isDisabled = isDayDisabled(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    data-day={format(day, DATE_FORMAT)}
                    aria-label={formatDate(day, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    aria-pressed={selected}
                    aria-disabled={isDisabled || undefined}
                    tabIndex={isSameDay(day, tabbableDay) ? 0 : -1}
                    onClick={() => handleSelectDay(day)}
                    onKeyDown={(event) => handleDayKeyDown(event, day)}
                    className={cn(
                      'flex h-11 items-center justify-center rounded-md text-sm tabular-nums hover:bg-muted',
                      'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      outside && 'text-muted-foreground/50',
                      isToday(day) && !selected && 'ring-1 ring-inset ring-border',
                      selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      isDisabled && 'cursor-default opacity-30 hover:bg-transparent'
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="time"
                aria-label={formatMessage({
                  id: 'content-releases.modal.form.input.label.time',
                  defaultMessage: 'Time',
                })}
                value={date ? time : ''}
                onChange={handleTimeChange}
                className={cn(
                  'h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
                )}
              />
              {date ? (
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                  {clearLabel}
                </button>
              ) : null}
            </div>

            {timezoneSlot ? <div className="mt-3">{timezoneSlot}</div> : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
