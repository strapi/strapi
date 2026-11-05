import * as React from 'react';

import { Button, Checkbox, Field, IconButton, Radio, TextInput } from '@strapi/design-system';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@strapi/design-system/next';
import { Cross } from '@strapi/icons';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Form, Formik, useFormikContext } from 'formik';
import { useIntl, type MessageDescriptor } from 'react-intl';

import { RELEASE_CONDITIONS } from '../../../shared/constants';
import { getTimezoneName, getTimezones, getWallClock, type TimezoneOption } from '../utils/time';
import { RELEASE_SCHEMA } from '../validation/schemas';

import { ReleaseDateTimePicker } from './ReleaseDateTimePicker';
import { ReleaseTimezoneSelect } from './ReleaseTimezoneSelect';

import type { ReleaseCondition } from '../../../shared/contracts/releases';

/**
 * The release side panels' size: the whole screen but its inset on a phone, 50rem from `sm` up.
 * Set on the variants the design system sizes its drawer with, so they replace its widths.
 */
export const RELEASE_DRAWER_CLASS_NAME =
  '[--drawer-inset:--spacing(4)] data-[swipe-axis=x]:[--drawer-content-width:calc(100%-2*var(--drawer-inset))] data-[swipe-axis=x]:sm:[--drawer-content-width:50rem]';

/**
 * Whether an Escape keydown is for a picker in the drawer rather than for the drawer: its list or
 * calendar is open, or the focus is in its popup, which renders outside the drawer
 */
const isEscapeForPicker = (target: EventTarget | null, drawer: HTMLElement | null) =>
  target instanceof Element &&
  (target.closest('[role="combobox"][aria-expanded="true"]') !== null ||
    (drawer !== null && !drawer.contains(target) && target !== target.ownerDocument.body));

// Used when the browser's timezone isn't in the list
const FALLBACK_TIMEZONE = 'UTC+00:00&Africa/Abidjan';

export interface ReleaseDrawerValues {
  name: string;
  scheduledAt: Date | null;
  // IANA name, e.g. Europe/Paris
  timezone: string | null;
  releaseCondition: ReleaseCondition;
}

interface FormValues {
  name: string;
  isScheduled: boolean;
  date: string | null;
  time: string;
  // A value of the timezone list
  timezone: string | null;
  releaseCondition: ReleaseCondition;
}

interface ReleaseDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ReleaseDrawerValues) => Promise<void> | void;
  title: string;
  submitLabel: string;
  initialValues: Omit<ReleaseDrawerValues, 'scheduledAt'> & {
    scheduledAt: string | Date | null;
    // A release without a date starts with "I don't have a release date yet" ticked
    isScheduled: boolean;
  };
  // A value of the timezone list, from the release settings
  defaultTimezone?: string | null;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  // Shown above the release info
  children?: React.ReactNode;
}

export const ReleaseDrawer = ({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  initialValues,
  defaultTimezone: settingsTimezone,
  isSubmitting = false,
  isSubmitDisabled = false,
  children,
}: ReleaseDrawerProps) => {
  const { formatMessage } = useIntl();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const isEscapeForPickerRef = React.useRef(false);

  // Pickers close on Escape from a listener on the document, in the capture phase, before the
  // drawer's own. This one is added when the drawer opens, before any picker's, so it runs first
  // and sees whether a picker is still open.
  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        isEscapeForPickerRef.current = isEscapeForPicker(event.target, drawerRef.current);
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [open]);

  const scheduledAt = initialValues.scheduledAt ? new Date(initialValues.scheduledAt) : null;
  const { timezoneList, systemTimezone } = getTimezones(scheduledAt ?? new Date());
  const findTimezone = (name: string | null | undefined) =>
    name
      ? timezoneList.find((timezone) => getTimezoneName(timezone.value) === name)?.value
      : undefined;
  const defaultTimezone =
    findTimezone(settingsTimezone && getTimezoneName(settingsTimezone)) ??
    systemTimezone?.value ??
    FALLBACK_TIMEZONE;
  const timezone = findTimezone(initialValues.timezone) ?? defaultTimezone;
  const wallClock =
    initialValues.isScheduled && scheduledAt
      ? getWallClock(scheduledAt, getTimezoneName(timezone))
      : null;

  const formInitialValues: FormValues = {
    name: initialValues.name,
    isScheduled: initialValues.isScheduled,
    date: wallClock?.date ?? null,
    time: wallClock?.time ?? '',
    timezone,
    releaseCondition: initialValues.releaseCondition,
  };

  const handleSubmit = (values: FormValues) => {
    const timezoneName =
      values.isScheduled && values.timezone ? getTimezoneName(values.timezone) : null;

    return onSubmit({
      name: values.name,
      scheduledAt:
        values.isScheduled && values.date && values.time && timezoneName
          ? zonedTimeToUtc(`${values.date} ${values.time}`, timezoneName)
          : null,
      timezone: timezoneName,
      releaseCondition: values.releaseCondition,
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen, eventDetails) => {
        // Legacy DS pickers (e.g. the DatePicker calendar) unmount their portal on pointerdown, so
        // Firefox dispatches the click that follows on <body>. base-ui counts a click on any
        // ancestor of the drawer as an outside press, which would close the drawer mid-edit. Real
        // outside presses land on the drawer's full-screen viewport, never on <body>.
        if (
          eventDetails.reason === 'outside-press' &&
          eventDetails.event.target === document.body
        ) {
          eventDetails.cancel();
          return;
        }

        // Escape closes the open picker only: the drawer, and what was typed in it, stay
        if (eventDetails.reason === 'escape-key' && isEscapeForPickerRef.current) {
          eventDetails.cancel();
          return;
        }

        if (!isOpen) onClose();
      }}
      swipeDirection="right"
    >
      <DrawerContent ref={drawerRef} className={RELEASE_DRAWER_CLASS_NAME}>
        <Formik<FormValues>
          onSubmit={handleSubmit}
          initialValues={formInitialValues}
          validationSchema={RELEASE_SCHEMA}
          validateOnChange={false}
        >
          {() => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <RevalidateAfterSubmit />
              <DrawerHeader>
                <div className="flex items-center justify-between gap-2">
                  <DrawerTitle className="text-base font-semibold md:text-sm">{title}</DrawerTitle>
                  <IconButton
                    variant="ghost"
                    onClick={onClose}
                    label={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                  >
                    <Cross />
                  </IconButton>
                </div>
              </DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {children}
                <div className="flex flex-col gap-4 p-4">
                  <h3 className="text-lg font-medium md:text-base">
                    {formatMessage({
                      id: 'content-releases.release-drawer.release-info.title',
                      defaultMessage: 'Release info',
                    })}
                  </h3>
                  <NameField />
                </div>
                <div className="flex flex-col gap-4 p-4">
                  <ScheduleFields timezoneList={timezoneList} defaultTimezone={defaultTimezone} />
                </div>
                <div className="border-t border-border" />
                <ReleaseModeField />
              </div>
              <DrawerFooter>
                <div className="flex justify-between border-t border-border pt-4">
                  <Button variant="tertiary" onClick={onClose}>
                    {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                  </Button>
                  <Button type="submit" loading={isSubmitting} disabled={isSubmitDisabled}>
                    {submitLabel}
                  </Button>
                </div>
              </DrawerFooter>
            </Form>
          )}
        </Formik>
      </DrawerContent>
    </Drawer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Fields
 * -----------------------------------------------------------------------------------------------*/

/**
 * A field's error, from the first submit on. From then on every change validates the form again
 * (see `RevalidateAfterSubmit`), so it goes away as soon as the field is valid.
 */
const useFieldError = (name: keyof FormValues) => {
  const { formatMessage } = useIntl();
  const { errors, submitCount } = useFormikContext<FormValues>();
  const error = errors[name];

  return submitCount > 0 && error ? formatMessage({ id: error, defaultMessage: error }) : undefined;
};

/**
 * Errors only show after the first submit, so validating every change before it would only cost
 * renders (enough to make typing lag). After it, every change is validated so stale errors clear.
 */
const RevalidateAfterSubmit = () => {
  const { values, submitCount, validateForm } = useFormikContext<FormValues>();

  React.useEffect(() => {
    if (submitCount > 0) {
      validateForm();
    }
  }, [values, submitCount, validateForm]);

  return null;
};

const NameField = () => {
  const { formatMessage } = useIntl();
  const { values, handleChange } = useFormikContext<FormValues>();

  return (
    <Field.Root name="name" error={useFieldError('name')} required>
      <Field.Label>
        {formatMessage({
          id: 'content-releases.release-drawer.form.name.label',
          defaultMessage: 'Release name',
        })}
      </Field.Label>
      <TextInput type="text" value={values.name} onChange={handleChange} />
      <Field.Error />
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ScheduleFields
 * -----------------------------------------------------------------------------------------------*/

interface ScheduleFieldsProps {
  timezoneList: TimezoneOption[];
  defaultTimezone: string;
}

const ScheduleFields = ({ timezoneList, defaultTimezone }: ScheduleFieldsProps) => {
  const { formatMessage } = useIntl();
  const { values, setFieldValue, setValues } = useFormikContext<FormValues>();
  const dateError = useFieldError('date');
  const timeError = useFieldError('time');
  // The timezone field is in the picker's popup: its error also shows under the picker, so a
  // submit it fails doesn't fail silently while the popup is closed
  const timezoneError = useFieldError('timezone');

  const handleNoScheduleChange = (hasNoSchedule: boolean) => {
    // The schedule is only disabled, so unticking brings back what was picked. Submitting without a
    // schedule still removes it from the release: the submit ignores it while `isScheduled` is false.
    // At once, so the form is validated once, with every change
    setValues({
      ...values,
      isScheduled: !hasNoSchedule,
      // A release opened without a date has no timezone yet
      timezone: values.timezone ?? defaultTimezone,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Field.Root
        name="date"
        error={values.isScheduled ? dateError || timeError || timezoneError : undefined}
        required={values.isScheduled}
      >
        <Field.Label>
          {formatMessage({
            id: 'content-releases.release-drawer.form.date-time.label',
            defaultMessage: 'Release date',
          })}
        </Field.Label>
        <ReleaseDateTimePicker
          placeholder={formatMessage({
            id: 'content-releases.release-drawer.form.date-time.placeholder',
            defaultMessage: 'Pick a date and time',
          })}
          date={values.date}
          time={values.time}
          onChange={(next) =>
            // At once, so the form is validated once, with both changes
            setValues({ ...values, date: next?.date ?? null, time: next?.time ?? '' })
          }
          clearLabel={formatMessage({
            id: 'content-releases.modal.form.input.clearLabel',
            defaultMessage: 'Clear',
          })}
          minDate={utcToZonedTime(new Date(), getTimezoneName(values.timezone || defaultTimezone))}
          disabled={!values.isScheduled}
          timezoneOffset={values.timezone ? values.timezone.split('&')[0] : undefined}
          timezoneSlot={
            <ReleaseTimezoneSelect
              timezoneOptions={timezoneList}
              value={values.timezone}
              date={values.date}
              error={timezoneError}
              setFieldValue={setFieldValue}
              disabled={!values.isScheduled}
            />
          }
        />
        <Field.Error />
      </Field.Root>
      <Checkbox
        checked={!values.isScheduled}
        onCheckedChange={(checked) => handleNoScheduleChange(checked === true)}
      >
        {formatMessage({
          id: 'content-releases.release-drawer.form.no-schedule',
          defaultMessage: "I don't have a release date yet",
        })}
      </Checkbox>
    </div>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseModeField
 * -----------------------------------------------------------------------------------------------*/

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const ReleaseModeField = () => {
  const { formatMessage } = useIntl();
  const { values, setFieldValue } = useFormikContext<FormValues>();
  // The radio group checks the radio an arrow key moves the focus to, but it watches the keys on
  // the document, and the drawer keeps arrow keys from reaching it (for its own keyboard
  // navigation). So the keys are watched here, in the capture phase. The group moves the focus
  // after a timeout, often after the key is released, so the focus consumes the flag rather
  // than the key release clearing it.
  const isArrowKeyPressed = React.useRef(false);

  return (
    <div
      className="flex flex-col gap-4 p-4"
      onKeyDownCapture={(event) => {
        isArrowKeyPressed.current = ARROW_KEYS.has(event.key);
      }}
    >
      <h3 className="text-lg font-medium md:text-base" id="release-condition-label">
        {formatMessage({
          id: 'content-releases.release-drawer.release-mode.title',
          defaultMessage: 'Release mode',
        })}
      </h3>
      <Radio.Group
        aria-labelledby="release-condition-label"
        value={values.releaseCondition}
        onValueChange={(value) => setFieldValue('releaseCondition', value)}
      >
        <div className="flex flex-col gap-4">
          {/* Design order, not the list's: releasing what's ready reads first, the default second */}
          {[...RELEASE_CONDITIONS].reverse().map((condition) => (
            <div key={condition} className="flex flex-col gap-1">
              <Radio.Item
                value={condition}
                onFocus={() => {
                  if (isArrowKeyPressed.current) {
                    isArrowKeyPressed.current = false;
                    setFieldValue('releaseCondition', condition);
                  }
                }}
              >
                {formatMessage(RELEASE_CONDITION_MESSAGES[condition].label)}
              </Radio.Item>
              <p className="pl-7 text-xs text-muted-foreground">
                {formatMessage(RELEASE_CONDITION_MESSAGES[condition].description)}
              </p>
            </div>
          ))}
        </div>
      </Radio.Group>
    </div>
  );
};

const RELEASE_CONDITION_MESSAGES = {
  allow_partial: {
    label: {
      id: 'content-releases.release-condition.allow_partial.label',
      defaultMessage: 'Release all ready items',
    },
    description: {
      id: 'content-releases.release-condition.allow_partial.description',
      defaultMessage: 'Releases entries that are ready and skips the rest at the scheduled time.',
    },
  },
  all_or_nothing: {
    label: {
      id: 'content-releases.release-condition.all_or_nothing.label',
      defaultMessage: 'Require every entry to be ready',
    },
    description: {
      id: 'content-releases.release-condition.all_or_nothing.description',
      defaultMessage: 'Nothing is released unless every entry is ready at the scheduled time.',
    },
  },
} satisfies Record<ReleaseCondition, Record<'label' | 'description', MessageDescriptor>>;
