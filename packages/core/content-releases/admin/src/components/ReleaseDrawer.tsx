import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  Combobox,
  ComboboxOption,
  DatePicker,
  Field,
  Flex,
  IconButton,
  Radio,
  TextInput,
  TimePicker,
  Typography,
} from '@strapi/design-system';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@strapi/design-system/next';
import { Cross } from '@strapi/icons';
import { format, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Form, Formik, useFormikContext } from 'formik';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { styled } from 'styled-components';

import { RELEASE_CONDITIONS } from '../../../shared/constants';
import { getTimezones } from '../utils/time';
import { RELEASE_SCHEMA } from '../validation/schemas';

import type { ReleaseCondition } from '../../../shared/contracts/releases';

export const DRAWER_STYLE = {
  '--drawer-inset': '1.6rem',
  '--drawer-content-width': '50rem',
} as React.CSSProperties;

// Used when the browser's timezone isn't in the list
const FALLBACK_TIMEZONE = 'UTC+00:00&Africa/Abidjan';

// The timezone list's values are `${offset}&${IANA name}`
const getTimezoneName = (timezone: string) => timezone.split('&')[1];
const formatTimezoneLabel = (timezone: string) => timezone.replace('&', ' ');

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
  // Fill today in the date of a scheduled release that has no date yet
  isDatePrefilled?: boolean;
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
  isDatePrefilled = true,
  isSubmitting = false,
  isSubmitDisabled = false,
  children,
}: ReleaseDrawerProps) => {
  const { formatMessage } = useIntl();

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
  const zonedScheduledAt = scheduledAt && utcToZonedTime(scheduledAt, getTimezoneName(timezone));
  const defaultDate = isDatePrefilled ? format(new Date(), 'yyyy-MM-dd') : null;

  const formInitialValues: FormValues = {
    name: initialValues.name,
    isScheduled: initialValues.isScheduled,
    date: initialValues.isScheduled
      ? zonedScheduledAt
        ? format(zonedScheduledAt, 'yyyy-MM-dd')
        : defaultDate
      : null,
    time: initialValues.isScheduled && zonedScheduledAt ? format(zonedScheduledAt, 'HH:mm') : '',
    timezone: initialValues.isScheduled ? timezone : null,
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

        if (!isOpen) onClose();
      }}
      swipeDirection="right"
    >
      <DrawerContent style={DRAWER_STYLE}>
        <Formik<FormValues>
          onSubmit={handleSubmit}
          initialValues={formInitialValues}
          validationSchema={RELEASE_SCHEMA}
          validateOnChange={false}
        >
          {({ values, errors, handleChange }) => (
            <DrawerForm>
              <DrawerHeader>
                <Flex justifyContent="space-between" alignItems="center" gap={2}>
                  <DrawerTitle>
                    <Typography variant="omega" fontWeight="bold">
                      {title}
                    </Typography>
                  </DrawerTitle>
                  <IconButton
                    variant="ghost"
                    onClick={onClose}
                    label={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                  >
                    <Cross />
                  </IconButton>
                </Flex>
              </DrawerHeader>
              <ScrollArea>
                {children}
                <Flex direction="column" alignItems="stretch" gap={4} padding={4}>
                  <Typography variant="delta" tag="h3">
                    {formatMessage({
                      id: 'content-releases.release-drawer.release-info.title',
                      defaultMessage: 'Release info',
                    })}
                  </Typography>
                  <Field.Root
                    name="name"
                    error={
                      errors.name && formatMessage({ id: errors.name, defaultMessage: errors.name })
                    }
                    required
                  >
                    <Field.Label>
                      {formatMessage({
                        id: 'content-releases.release-drawer.form.name.label',
                        defaultMessage: 'Release name',
                      })}
                    </Field.Label>
                    <TextInput type="text" value={values.name} onChange={handleChange} />
                    <Field.Error />
                  </Field.Root>
                  <ScheduleFields
                    timezoneList={timezoneList}
                    defaultTimezone={defaultTimezone}
                    defaultDate={defaultDate}
                    initialSchedule={formInitialValues}
                  />
                </Flex>
                <Box borderColor="neutral150" borderStyle="solid" borderWidth="1px 0 0 0" />
                <ReleaseModeField />
              </ScrollArea>
              <DrawerFooter>
                <Flex
                  justifyContent="space-between"
                  paddingTop={4}
                  borderColor="neutral150"
                  borderStyle="solid"
                  borderWidth="1px 0 0 0"
                >
                  <Button variant="tertiary" onClick={onClose}>
                    {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                  </Button>
                  <Button type="submit" loading={isSubmitting} disabled={isSubmitDisabled}>
                    {submitLabel}
                  </Button>
                </Flex>
              </DrawerFooter>
            </DrawerForm>
          )}
        </Formik>
      </DrawerContent>
    </Drawer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ScheduleFields
 * -----------------------------------------------------------------------------------------------*/

interface ScheduleFieldsProps {
  timezoneList: TimezoneOption[];
  defaultTimezone: string;
  defaultDate: string | null;
  initialSchedule: Pick<FormValues, 'date' | 'time' | 'timezone'>;
}

const ScheduleFields = ({
  timezoneList,
  defaultTimezone,
  defaultDate,
  initialSchedule,
}: ScheduleFieldsProps) => {
  const { formatMessage } = useIntl();
  const { values, errors, setFieldValue } = useFormikContext<FormValues>();

  const handleNoScheduleChange = (hasNoSchedule: boolean) => {
    setFieldValue('isScheduled', !hasNoSchedule);

    if (hasNoSchedule) {
      // Submitting without a schedule also removes it from the release
      setFieldValue('date', null);
      setFieldValue('time', '');
      setFieldValue('timezone', null);
    } else {
      setFieldValue('date', initialSchedule.date ?? defaultDate);
      setFieldValue('time', initialSchedule.time);
      setFieldValue('timezone', initialSchedule.timezone ?? defaultTimezone);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="pi" fontWeight="bold" textColor="neutral800">
        {formatMessage({
          id: 'content-releases.release-drawer.form.schedule.label',
          defaultMessage: 'Schedule',
        })}
      </Typography>
      {values.isScheduled && (
        <>
          <Flex gap={2} alignItems="start">
            <Box flex={1}>
              <Field.Root
                name="date"
                error={
                  errors.date && formatMessage({ id: errors.date, defaultMessage: errors.date })
                }
                required
              >
                <DatePicker
                  aria-label={formatMessage({
                    id: 'content-releases.modal.form.input.label.date',
                    defaultMessage: 'Date',
                  })}
                  onChange={(date) => {
                    setFieldValue(
                      'date',
                      date ? formatISO(date, { representation: 'date' }) : null
                    );
                  }}
                  clearLabel={formatMessage({
                    id: 'content-releases.modal.form.input.clearLabel',
                    defaultMessage: 'Clear',
                  })}
                  onClear={() => setFieldValue('date', null)}
                  value={values.date ? new Date(values.date) : undefined}
                  minDate={utcToZonedTime(
                    new Date(),
                    // A cleared timezone is '': fall back to the default
                    getTimezoneName(values.timezone || defaultTimezone)
                  )}
                />
                <Field.Error />
              </Field.Root>
            </Box>
            <Box flex={1}>
              <Field.Root
                name="time"
                error={
                  errors.time && formatMessage({ id: errors.time, defaultMessage: errors.time })
                }
                required
              >
                <TimePicker
                  aria-label={formatMessage({
                    id: 'content-releases.modal.form.input.label.time',
                    defaultMessage: 'Time',
                  })}
                  onChange={(time) => setFieldValue('time', time)}
                  clearLabel={formatMessage({
                    id: 'content-releases.modal.form.input.clearLabel',
                    defaultMessage: 'Clear',
                  })}
                  onClear={() => setFieldValue('time', '')}
                  value={values.time || undefined}
                />
                <Field.Error />
              </Field.Root>
            </Box>
          </Flex>
          <TimezoneField timezoneOptions={timezoneList} />
        </>
      )}
      <Checkbox
        checked={!values.isScheduled}
        onCheckedChange={(checked) => handleNoScheduleChange(checked === true)}
      >
        {formatMessage({
          id: 'content-releases.release-drawer.form.no-schedule',
          defaultMessage: "I don't have a release date yet",
        })}
      </Checkbox>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * TimezoneField
 * -----------------------------------------------------------------------------------------------*/

interface TimezoneOption {
  offset: string;
  value: string;
}

const TimezoneField = ({ timezoneOptions }: { timezoneOptions: TimezoneOption[] }) => {
  const { values, errors, setFieldValue } = useFormikContext<FormValues>();
  const { formatMessage } = useIntl();
  const [timezoneList, setTimezoneList] = React.useState<TimezoneOption[]>(timezoneOptions);

  React.useEffect(() => {
    if (values.date) {
      // Update the timezone offset which varies with DST based on the date selected
      const { timezoneList } = getTimezones(new Date(values.date));
      setTimezoneList(timezoneList);

      const selectedName = values.timezone && getTimezoneName(values.timezone);
      const updatedTimezone = timezoneList.find(
        (timezone) => getTimezoneName(timezone.value) === selectedName
      );
      if (updatedTimezone) {
        setFieldValue('timezone', updatedTimezone.value);
      }
    }
  }, [setFieldValue, values.date, values.timezone]);

  return (
    <Field.Root
      name="timezone"
      error={
        errors.timezone && formatMessage({ id: errors.timezone, defaultMessage: errors.timezone })
      }
      required
    >
      <Field.Label>
        {formatMessage({
          id: 'content-releases.modal.form.input.label.timezone',
          defaultMessage: 'Timezone',
        })}
      </Field.Label>
      <Combobox
        autocomplete={{ type: 'list', filter: 'contains' }}
        value={values.timezone || undefined}
        // Without `textValue`, the input keeps showing the offset from before the date changed
        textValue={values.timezone ? formatTimezoneLabel(values.timezone) : undefined}
        onChange={(timezone) => {
          setFieldValue('timezone', timezone);
        }}
        onTextValueChange={(timezone) => {
          setFieldValue('timezone', timezone);
        }}
        onClear={() => {
          setFieldValue('timezone', '');
        }}
      >
        {timezoneList.map((timezone) => (
          <ComboboxOption key={timezone.value} value={timezone.value}>
            {formatTimezoneLabel(timezone.value)}
          </ComboboxOption>
        ))}
      </Combobox>
      <Field.Error />
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseModeField
 * -----------------------------------------------------------------------------------------------*/

const ReleaseModeField = () => {
  const { formatMessage } = useIntl();
  const { values, setFieldValue } = useFormikContext<FormValues>();

  return (
    <Flex direction="column" alignItems="stretch" gap={4} padding={4}>
      <Typography variant="delta" tag="h3" id="release-condition-label">
        {formatMessage({
          id: 'content-releases.release-drawer.release-mode.title',
          defaultMessage: 'Release mode',
        })}
      </Typography>
      <Radio.Group
        aria-labelledby="release-condition-label"
        value={values.releaseCondition}
        onValueChange={(value) => setFieldValue('releaseCondition', value)}
      >
        <Flex direction="column" alignItems="stretch" gap={4}>
          {RELEASE_CONDITIONS.map((condition) => (
            <Flex key={condition} direction="column" alignItems="stretch" gap={1}>
              <Radio.Item value={condition}>
                {formatMessage(RELEASE_CONDITION_MESSAGES[condition].label)}
              </Radio.Item>
              <Box paddingLeft={6}>
                <Typography variant="pi" textColor="neutral600">
                  {formatMessage(RELEASE_CONDITION_MESSAGES[condition].description)}
                </Typography>
              </Box>
            </Flex>
          ))}
        </Flex>
      </Radio.Group>
    </Flex>
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

const DrawerForm = styled(Form)`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

export const ScrollArea = styled(Box)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;
