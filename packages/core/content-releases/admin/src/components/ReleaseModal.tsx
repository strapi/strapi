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
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import formatISO from 'date-fns/formatISO';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useTimezoneSelect, allTimezones, type ITimezoneOption } from 'react-timezone-select';

import { RELEASE_SCHEMA } from '../../../shared/validation-schemas';
import { pluginId } from '../pluginId';

export interface FormValues {
  name: string;
  date: Date | null;
  time: string;
  timezone: string;
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
  const { parseTimezone, options: timezoneOptions } = useTimezoneSelect({
    labelStyle: 'original',
    timezones: allTimezones,
  });
  const usersTimezone = parseTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const getScheduledTimestamp = (values: FormValues) => {
    const { date, time, timezone } = values;
    if (!date || !time || !timezone) return null;

    const [hours, minutes] = time.split(':').map(Number);
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(hours);
    combinedDateTime.setMinutes(minutes);
    const { offset } = parseTimezone(timezone); // Offset is in hours
    if (!offset && offset !== 0) {
      return combinedDateTime;
    }
    // Adjust the date based on the selected timezone offset
    const combinedDate = combinedDateTime.getTime();
    const combinedDateWithOffset = combinedDate - offset * 60 * 60 * 1000; // Convert offset in hours to milliseconds

    // Because new Date always adds local timezone offset, remove it to set the correct UTC time
    const dateObject = new Date(combinedDateWithOffset);
    const scheduledDate = new Date(
      dateObject.getTime() - dateObject.getTimezoneOffset() * 60 * 1000
    );
    return scheduledDate;
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
        validateOnChange={false}
        onSubmit={(values) => {
          handleSubmit({
            ...values,
            scheduledAt: values.isScheduled ? getScheduledTimestamp(values) : null,
          });
        }}
        initialValues={{
          ...initialValues,
          timezone: initialValues.timezone ? initialValues.timezone : usersTimezone.value,
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
                <Checkbox
                  name="isScheduled"
                  value={values.isScheduled}
                  onChange={(event) => {
                    setFieldValue('isScheduled', event.target.checked);
                    if (!event.target.checked) {
                      setFieldValue('date', null);
                      setFieldValue('time', '');
                    } else {
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
                            // TODO: UT error: It looks like you're passing a string as representation of a Date to the DatePicker.
                            // This is deprecated, look to passing a Date instead.
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
                        />
                      </Box>
                    </Flex>
                    <SingleSelect
                      label={formatMessage({
                        id: 'content-releases.modal.form.input.label.timezone',
                        defaultMessage: 'Timezone',
                      })}
                      value={values.timezone}
                      onChange={(timezone) => {
                        if (typeof timezone === 'string') {
                          setFieldValue('timezone', timezone);
                        }
                      }}
                      onClear={() => {
                        setFieldValue('timezone', '');
                      }}
                      required
                    >
                      {timezoneOptions.map((timezone: ITimezoneOption) => (
                        <SingleSelectOption key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
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
