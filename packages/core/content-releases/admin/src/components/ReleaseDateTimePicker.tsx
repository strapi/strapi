import * as React from 'react';

import { Popover } from '@base-ui/react/popover';
import { cn } from '@strapi/design-system/next';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

/**
 * PROTOTYPE: a single combined date + time picker built on `/next` primitives
 * (@base-ui Popover + Tailwind tokens), replacing the two separate legacy
 * DatePicker / TimePicker fields in the Release drawer.
 *
 * The calendar grid is hand-built on date-fns to avoid adding `react-day-picker`
 * as a plugin dependency. When `/next` grows a proper Calendar/Popover, a dev
 * should promote this there and swap the import.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const CalendarBlank = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" {...props}>
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
  </svg>
);

const CaretLeft = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" {...props}>
    <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
  </svg>
);

const CaretRight = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" {...props}>
    <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
  </svg>
);

const ClockIcon = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" {...props}>
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" />
  </svg>
);

const XIcon = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" {...props}>
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);

export interface ReleaseDateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  onClear?: () => void;
  minDate?: Date;
  placeholder?: string;
  clearLabel?: string;
  disabled?: boolean;
  'aria-label'?: string;
  /** Offset shown after the time once a value is picked, e.g. "UTC+01:00" */
  timezoneOffset?: string;
  /** Rendered inside the popover under the time row (e.g. the timezone combobox) */
  timezoneSlot?: React.ReactNode;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const ReleaseDateTimePicker = ({
  value,
  onChange,
  onClear,
  minDate,
  placeholder = 'Pick a date and time',
  clearLabel = 'Clear',
  disabled = false,
  'aria-label': ariaLabel,
  timezoneSlot,
  timezoneOffset,
}: ReleaseDateTimePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(value ?? minDate ?? new Date());

  // Jump the calendar to the selected value when editing an existing release
  React.useEffect(() => {
    if (value) {
      setViewMonth(value);
    }
  }, [value]);

  const minDay = minDate ? startOfDay(minDate) : undefined;

  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
      }),
    [viewMonth]
  );

  const handleSelectDay = (day: Date) => {
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    onChange(next);
    setViewMonth(next);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return;
    }
    const base = value ? new Date(value) : startOfDay(new Date());
    base.setHours(hours, minutes, 0, 0);
    onChange(base);
  };

  const handleClear = () => {
    onChange(undefined);
    onClear?.();
  };

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
        role="combobox"
        aria-label={ariaLabel}
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
        <span className={cn('flex-1 text-left', !value && 'text-muted-foreground')}>
          {value
            ? `${format(value, 'd MMM yyyy, HH:mm')}${timezoneOffset ? ` ${timezoneOffset}` : ''}`
            : placeholder}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="left"
          align="start"
          sideOffset={8}
          collisionAvoidance={{ side: 'none', align: 'none', fallbackAxisSide: 'none' }}
          className="z-[1000]"
        >
          <Popover.Popup
            className={cn(
              'w-[34rem] rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none'
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewMonth((month) => subMonths(month, 1))}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <CaretLeft className="size-4" />
              </button>
              <span className="text-base font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth((month) => addMonths(month, 1))}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <CaretRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="flex h-9 items-center justify-center text-sm font-medium text-muted-foreground"
                >
                  {weekday}
                </div>
              ))}
              {days.map((day) => {
                const selected = value ? isSameDay(day, value) : false;
                const outside = !isSameMonth(day, viewMonth);
                const isDisabled = minDay ? day < minDay : false;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      'flex h-11 items-center justify-center rounded-md text-sm tabular-nums hover:bg-muted',
                      outside && 'text-muted-foreground/50',
                      isToday(day) && !selected && 'ring-1 ring-inset ring-border',
                      selected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      isDisabled && 'pointer-events-none opacity-30'
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
                aria-label="Time"
                value={value ? format(value, 'HH:mm') : ''}
                onChange={handleTimeChange}
                className={cn(
                  'h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
                )}
              />
              {value ? (
                <button
                  type="button"
                  onClick={handleClear}
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
