import * as React from 'react';

import {
  Button,
  ModalBody,
  ModalFooter,
  ModalLayout,
  ModalHeader,
  TextInput,
  Typography,
  Checkbox,
  Flex,
  Box,
  DatePicker,
  TimePicker,
  Combobox,
  ComboboxOption,
} from '@strapi/design-system';
import { formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Formik, Form, useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { RELEASE_SCHEMA } from '../../../shared/validation-schemas';
import { pluginId } from '../pluginId';
import { getTimezoneOffset } from '../utils/time';

export interface FormValues {
  name: string;
  date: string | null;
  time: string;
  timezone: string | null;
  isScheduled?: boolean;
  scheduledAt: Date | null;
}

interface ReleaseModalProps {
  handleClose: () => void;
  handleSubmit: (values: FormValues) => void;
  isLoading?: boolean;
  initialValues: FormValues;
}

export const ReleaseModal = ({
  handleClose,
  handleSubmit,
  initialValues,
  isLoading = false,
}: ReleaseModalProps) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const isCreatingRelease = pathname === `/plugins/${pluginId}`;
  // Set default first timezone from the list if no system timezone detected
  const { timezoneList, systemTimezone = { value: 'UTC+00:00-Africa/Abidjan ' } } = getTimezones(
    initialValues.scheduledAt ? new Date(initialValues.scheduledAt) : new Date()
  );

  /**
   * Generate scheduled time using selected date, time and timezone
   */
  const getScheduledTimestamp = (values: FormValues) => {
    const { date, time, timezone } = values;
    if (!date || !time || !timezone) return null;
    const timezoneWithoutOffset = timezone.split('&')[1];
    return zonedTimeToUtc(`${date} ${time}`, timezoneWithoutOffset);
  };

  /**
   * Get timezone with offset to show the selected value in the dropdown
   */
  const getTimezoneWithOffset = () => {
    const currentTimezone = timezoneList.find(
      (timezone) => timezone.value.split('&')[1] === initialValues.timezone
    );
    return currentTimezone?.value || systemTimezone.value;
  };

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Typography id="title" fontWeight="bold" textColor="neutral800">
          {formatMessage(
            {
              id: 'content-releases.modal.title',
              defaultMessage:
                '{isCreatingRelease, select, true {New release} other {Edit release}}',
            },
            { isCreatingRelease: isCreatingRelease }
          )}
        </Typography>
      </ModalHeader>
      <Formik
        onSubmit={(values) => {
          handleSubmit({
            ...values,
            timezone: values.timezone ? values.timezone.split('&')[1] : null,
            scheduledAt: values.isScheduled ? getScheduledTimestamp(values) : null,
          });
        }}
        initialValues={{
          ...initialValues,
          timezone: initialValues.timezone ? getTimezoneWithOffset() : systemTimezone.value,
        }}
        validationSchema={RELEASE_SCHEMA}
        validateOnChange={false}
      >
        {({ values, errors, handleChange, setFieldValue }) => (
          <Form>
            <ModalBody>
              <Flex direction="column" alignItems="stretch" gap={6}>
                <TextInput
                  label={formatMessage({
                    id: 'content-releases.modal.form.input.label.release-name',
                    defaultMessage: 'Name',
                  })}
                  name="name"
                  value={values.name}
                  error={errors.name}
                  onChange={handleChange}
                  required
                />
                <Box width="max-content">
                  <Checkbox
                    name="isScheduled"
                    value={values.isScheduled}
                    onChange={(event) => {
                      setFieldValue('isScheduled', event.target.checked);
                      if (!event.target.checked) {
                        // Clear scheduling info from a release on unchecking schedule release, which reset scheduling info in DB
                        setFieldValue('date', null);
                        setFieldValue('time', '');
                        setFieldValue('timezone', null);
                      } else {
                        // On ticking back schedule release date, time and timezone should be restored to the initial state
                        setFieldValue('date', initialValues.date);
                        setFieldValue('time', initialValues.time);
                        setFieldValue('timezone', initialValues.timezone ?? systemTimezone?.value);
                      }
                    }}
                  >
                    <Typography
                      textColor={values.isScheduled ? 'primary600' : 'neutral800'}
                      fontWeight={values.isScheduled ? 'semiBold' : 'regular'}
                    >
                      {formatMessage({
                        id: 'modal.form.input.label.schedule-release',
                        defaultMessage: 'Schedule release',
                      })}
                    </Typography>
                  </Checkbox>
                </Box>
                {values.isScheduled && (
                  <>
                    <Flex gap={4} alignItems="start">
                      <Box width="100%">
                        <DatePicker
                          label={formatMessage({
                            id: 'content-releases.modal.form.input.label.date',
                            defaultMessage: 'Date',
                          })}
                          name="date"
                          error={errors.date}
                          onChange={(date) => {
                            const isoFormatDate = date
                              ? formatISO(date, { representation: 'date' })
                              : null;
                            setFieldValue('date', isoFormatDate);
                          }}
                          clearLabel={formatMessage({
                            id: 'content-releases.modal.form.input.clearLabel',
                            defaultMessage: 'Clear',
                          })}
                          onClear={() => {
                            setFieldValue('date', null);
                          }}
                          selectedDate={values.date || undefined}
                          required
                          minDate={utcToZonedTime(new Date(), values.timezone.split('&')[1])}
                        />
                      </Box>
                      <Box width="100%">
                        <TimePicker
                          label={formatMessage({
                            id: 'content-releases.modal.form.input.label.time',
                            defaultMessage: 'Time',
                          })}
                          name="time"
                          error={errors.time}
                          onChange={(time) => {
                            setFieldValue('time', time);
                          }}
                          clearLabel={formatMessage({
                            id: 'content-releases.modal.form.input.clearLabel',
                            defaultMessage: 'Clear',
                          })}
                          onClear={() => {
                            setFieldValue('time', '');
                          }}
                          value={values.time || undefined}
                          required
                        />
                      </Box>
                    </Flex>
                    <TimezoneComponent timezoneOptions={timezoneList} />
                  </>
                )}
              </Flex>
            </ModalBody>
            <ModalFooter
              startActions={
                <Button onClick={handleClose} variant="tertiary" name="cancel">
                  {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                </Button>
              }
              endActions={
                <Button name="submit" loading={isLoading} type="submit">
                  {formatMessage(
                    {
                      id: 'content-releases.modal.form.button.submit',
                      defaultMessage: '{isCreatingRelease, select, true {Continue} other {Save}}',
                    },
                    { isCreatingRelease: isCreatingRelease }
                  )}
                </Button>
              }
            />
          </Form>
        )}
      </Formik>
    </ModalLayout>
  );
};

/**
 * Generates the list of timezones and user's current timezone(system timezone)
 */
interface ITimezoneOption {
  offset: string;
  value: string;
}

const getTimezones = (selectedDate: Date) => {
  const timezoneList: ITimezoneOption[] = Intl.supportedValuesOf('timeZone').map((timezone) => {
    // Timezone will be in the format GMT${OFFSET} where offset could be nothing,
    // a four digit string e.g. +05:00 or -08:00
    const utcOffset = getTimezoneOffset(timezone, selectedDate);

    // Offset and timezone are concatenated with '&', so to split and save the required timezone in DB
    return { offset: utcOffset, value: `${utcOffset}&${timezone}` } satisfies ITimezoneOption;
  });

  const systemTimezone = timezoneList.find(
    (timezone) => timezone.value.split('&')[1] === Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return { timezoneList, systemTimezone };
};

const TimezoneComponent = ({ timezoneOptions }: { timezoneOptions: ITimezoneOption[] }) => {
  const { values, errors, setFieldValue } = useFormikContext<FormValues>();
  const { formatMessage } = useIntl();
  const [timezoneList, setTimezoneList] = React.useState<ITimezoneOption[]>(timezoneOptions);

  React.useEffect(() => {
    if (values.date) {
      // Update the timezone offset which varies with DST based on the date selected
      const { timezoneList } = getTimezones(new Date(values.date));
      setTimezoneList(timezoneList);

      const updatedTimezone =
        values.timezone &&
        timezoneList.find((tz) => tz.value.split('&')[1] === values.timezone!.split('&')[1]);
      if (updatedTimezone) {
        setFieldValue('timezone', updatedTimezone!.value);
      }
    }
  }, [setFieldValue, values.date, values.timezone]);

  return (
    <Combobox
      label={formatMessage({
        id: 'content-releases.modal.form.input.label.timezone',
        defaultMessage: 'Timezone',
      })}
      autocomplete={{ type: 'list', filter: 'contains' }}
      name="timezone"
      value={values.timezone || undefined}
      textValue={values.timezone ? values.timezone.replace(/&/, ' ') : undefined} // textValue is required to show the updated DST timezone
      onChange={(timezone) => {
        setFieldValue('timezone', timezone);
      }}
      onTextValueChange={(timezone) => {
        setFieldValue('timezone', timezone);
      }}
      onClear={() => {
        setFieldValue('timezone', '');
      }}
      error={errors.timezone}
      required
    >
      {timezoneList.map((timezone) => (
        <ComboboxOption key={timezone.value} value={timezone.value}>
          {timezone.value.replace(/&/, ' ')}
        </ComboboxOption>
      ))}
    </Combobox>
  );
};
