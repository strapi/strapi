import * as React from 'react';

import { Combobox } from '@base-ui/react/combobox';
import { Field } from '@strapi/design-system';
import { cn } from '@strapi/design-system/next';
import { useIntl } from 'react-intl';

import { getTimezoneName, getTimezones, type TimezoneOption } from '../utils/time';

/**
 * PROTOTYPE: timezone picker rebuilt on the `/next` stack (@base-ui Combobox + Tailwind) so it
 * composes inside the base-ui Popover of ReleaseDateTimePicker. The legacy DS Combobox is react-aria
 * based and its listbox would not open when nested in a base-ui popover.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const CaretDown = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" aria-hidden {...props}>
    <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

const XIcon = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" width="1em" height="1em" aria-hidden {...props}>
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);

const formatTimezoneLabel = (timezone: string) => timezone.replaceAll('&', ' ');

export interface ReleaseTimezoneSelectProps {
  timezoneOptions: TimezoneOption[];
  value: string | null;
  date: string | null;
  error?: string;
  setFieldValue: (field: string, value: string) => void;
  disabled?: boolean;
}

export const ReleaseTimezoneSelect = React.memo(
  ({
    timezoneOptions,
    value,
    date,
    error,
    setFieldValue,
    disabled = false,
  }: ReleaseTimezoneSelectProps) => {
    const { formatMessage } = useIntl();
    const [timezoneList, setTimezoneList] = React.useState<TimezoneOption[]>(timezoneOptions);

    React.useEffect(() => {
      if (date) {
        // Recompute the offset (varies with DST) for the selected date
        const { timezoneList: nextList } = getTimezones(new Date(date));
        setTimezoneList(nextList);

        const selectedName = value && getTimezoneName(value);
        const updated = nextList.find(
          (timezone) => getTimezoneName(timezone.value) === selectedName
        );
        if (updated) {
          setFieldValue('timezone', updated.value);
        }
      }
    }, [setFieldValue, date, value]);

    const items = React.useMemo(
      () => timezoneList.map((timezone) => timezone.value),
      [timezoneList]
    );

    return (
      <Field.Root name="timezone" error={error} required={!disabled}>
        <Field.Label>
          {formatMessage({
            id: 'content-releases.modal.form.input.label.timezone',
            defaultMessage: 'Timezone',
          })}
        </Field.Label>
        <Combobox.Root
          disabled={disabled}
          items={items}
          value={value || null}
          onValueChange={(next) => setFieldValue('timezone', next ?? '')}
          itemToStringLabel={formatTimezoneLabel}
        >
          <div className="relative">
            <TimezoneInput />
            <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
              <Combobox.Clear
                aria-label={formatMessage({
                  id: 'content-releases.modal.form.input.clearLabel',
                  defaultMessage: 'Clear',
                })}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </Combobox.Clear>
              <Combobox.Trigger
                aria-label={formatMessage({
                  id: 'content-releases.modal.form.input.timezone.open',
                  defaultMessage: 'Show timezones',
                })}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Combobox.Icon>
                  <CaretDown className="size-4" />
                </Combobox.Icon>
              </Combobox.Trigger>
            </div>
          </div>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4} className="z-[1100]">
              <Combobox.Popup
                className={cn(
                  'max-h-56 w-[var(--anchor-width)] overflow-auto rounded-md border border-border bg-popover p-1',
                  'text-popover-foreground shadow-md outline-none'
                )}
              >
                <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
                  {formatMessage({
                    id: 'content-releases.modal.form.input.timezone.empty',
                    defaultMessage: 'No timezones found',
                  })}
                </Combobox.Empty>
                <Combobox.List>
                  {(item: string) => (
                    <Combobox.Item
                      key={item}
                      value={item}
                      className={cn(
                        'flex cursor-default items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none',
                        'data-[highlighted]:bg-muted data-[selected]:font-medium'
                      )}
                    >
                      {formatTimezoneLabel(item)}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <Field.Error />
      </Field.Root>
    );
  }
);

/**
 * The combobox's input, named by the field's label and described by its error
 */
const TimezoneInput = () => {
  const { formatMessage } = useIntl();
  const { id, error, required } = Field.useField('TimezoneInput');

  return (
    <Combobox.Input
      id={id}
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={Boolean(error)}
      aria-required={required}
      placeholder={formatMessage({
        id: 'content-releases.modal.form.input.placeholder.timezone',
        defaultMessage: 'Select or enter a value',
      })}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-background pl-3 pr-14 text-sm outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    />
  );
};
