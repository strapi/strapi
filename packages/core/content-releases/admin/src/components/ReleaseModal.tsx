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
import { formatISO, parse } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { RELEASE_SCHEMA } from '../../../shared/validation-schemas';
import { pluginId } from '../pluginId';

export interface FormValues {
  name: string;
  date: Date | null;
  time: string;
  timezone?: string;
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
  // Set default first value from the timezone list with offset UTC+00:00
  const { timezoneList, currentTimezone = { value: 'Africa/Abidjan' } } = useTimezone();

  /**
   * Generate scheduled time using selected date, time and timezone
   */
  const getScheduledTimestamp = (values: FormValues) => {
    const { date, time, timezone } = values;
    if (!date || !time || !timezone) return null;
    const formattedDate = parse(`${time}`, 'HH:mm', new Date(date));
    return zonedTimeToUtc(formattedDate, timezone);
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
            scheduledAt: values.isScheduled ? getScheduledTimestamp(values) : null,
          });
        }}
        initialValues={{
          ...initialValues,
          timezone: initialValues.timezone ? initialValues.timezone : currentTimezone.value,
        }}
        validationSchema={RELEASE_SCHEMA}
      >
        {({ values, errors, dirty, handleChange, setFieldValue }) => (
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
                {/* Remove future flag check after Scheduling Beta release */}
                {window.strapi.future.isEnabled('contentReleasesScheduling') && (
                  <>
                    <Checkbox
                      name="isScheduled"
                      value={values.isScheduled}
                      onChange={(event) => {
                        setFieldValue('isScheduled', event.target.checked);
                        if (!event.target.checked) {
                          // Clear scheduling info from a release on unchecking schedule release
                          setFieldValue('date', null);
                          setFieldValue('time', '');
                        } else {
                          // On ticking back schedule release date and time should be restored to the initial state
                          setFieldValue('date', initialValues.date);
                          setFieldValue('time', initialValues.time);
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
                    {values.isScheduled && (
                      <>
                        <Flex gap={4}>
                          <Box width="100%">
                            <DatePicker
                              label={formatMessage({
                                id: 'content-releases.modal.form.input.label.date',
                                defaultMessage: 'Date',
                              })}
                              name="date"
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
                              selectedDate={values.date ? new Date(values.date) : undefined}
                              required
                            />
                          </Box>
                          <Box width="100%">
                            <TimePicker
                              label={formatMessage({
                                id: 'content-releases.modal.form.input.label.time',
                                defaultMessage: 'Time',
                              })}
                              name="time"
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
                        <Combobox
                          label={formatMessage({
                            id: 'content-releases.modal.form.input.label.timezone',
                            defaultMessage: 'Timezone',
                          })}
                          value={values.timezone}
                          onChange={(timezone) => {
                            setFieldValue('timezone', timezone);
                          }}
                          onClear={() => {
                            setFieldValue('timezone', '');
                          }}
                          required
                        >
                          {timezoneList.map((timezone) => (
                            <ComboboxOption key={timezone.value} value={timezone.value}>
                              {timezone.offset} {timezone.value}
                            </ComboboxOption>
                          ))}
                        </Combobox>
                      </>
                    )}
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
                <Button
                  name="submit"
                  loading={isLoading}
                  disabled={
                    !dirty ||
                    !values.name ||
                    (values.isScheduled && (!values.time || !values.date || !values.timezone))
                  }
                  type="submit"
                >
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
 * Timezone hook - Generates the list of timezones and user's current timezone
 */

interface ITimezoneOption {
  offset: string;
  value: string;
}

const useTimezone = () => {
  const timezoneList: ITimezoneOption[] = Intl.supportedValuesOf('timeZone').map((timezone) => {
    /**
     * This will be in the format GMT${OFFSET} where offset could be
     * nothing, a four digit string e.g. +05:00 or -08:00
     */
    const offsetPart = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts()
      .find((part) => part.type === 'timeZoneName');

    const offset = offsetPart ? offsetPart.value : '';

    /**
     * We want to show time based on UTC, not GMT so we swap that.
     */
    let utcOffset = offset.replace('GMT', 'UTC');

    /**
     * For perfect UTC (UTC+0:00) we only get the string UTC.
     * So we need to append the 0's.
     */
    if (!utcOffset.includes('+') && !utcOffset.includes('-')) {
      utcOffset = `${utcOffset}+00:00`;
    }

    return { offset: utcOffset, value: timezone } satisfies ITimezoneOption;
  });

  const currentTimezone = timezoneList.find(
    (timezone) => timezone.value === Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return { timezoneList, currentTimezone };
};
