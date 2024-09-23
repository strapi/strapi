import * as React from 'react';

import {
  Button,
  Modal,
  TextInput,
  Typography,
  Checkbox,
  Flex,
  Box,
  DatePicker,
  TimePicker,
  Combobox,
  ComboboxOption,
  Field,
} from '@strapi/design-system';
import { formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Formik, Form, useFormikContext } from 'formik';
import { MessageDescriptor, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { pluginId } from '../pluginId';
import { getTimezones } from '../utils/time';
import { RELEASE_SCHEMA } from '../validation/schemas';

export interface FormValues {
  name: string;
  date?: string;
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
  open?: boolean;
}

export const ReleaseModal = ({
  handleClose,
  open,
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
    <Modal.Root open={open} onOpenChange={handleClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage(
              {
                id: 'content-releases.modal.title',
                defaultMessage:
                  '{isCreatingRelease, select, true {New release} other {Edit release}}',
              },
              { isCreatingRelease: isCreatingRelease }
            )}
          </Modal.Title>
        </Modal.Header>
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
          {({ values, errors, handleChange, setFieldValue }) => {
            return (
              <Form>
                <Modal.Body>
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    <Field.Root
                      name="name"
                      error={
                        errors.name &&
                        formatMessage({ id: errors.name, defaultMessage: errors.name })
                      }
                      required
                    >
                      <Field.Label>
                        {formatMessage({
                          id: 'content-releases.modal.form.input.label.release-name',
                          defaultMessage: 'Name',
                        })}
                      </Field.Label>
                      <TextInput value={values.name} onChange={handleChange} />
                      <Field.Error />
                    </Field.Root>
                    <Box width="max-content">
                      <Checkbox
                        name="isScheduled"
                        checked={values.isScheduled}
                        onCheckedChange={(checked) => {
                          setFieldValue('isScheduled', checked);
                          if (!checked) {
                            // Clear scheduling info from a release on unchecking schedule release, which reset scheduling info in DB
                            setFieldValue('date', null);
                            setFieldValue('time', '');
                            setFieldValue('timezone', null);
                          } else {
                            // On ticking back schedule release date, time and timezone should be restored to the initial state
                            setFieldValue('date', initialValues.date);
                            setFieldValue('time', initialValues.time);
                            setFieldValue(
                              'timezone',
                              initialValues.timezone ?? systemTimezone?.value
                            );
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
                            <Field.Root
                              name="date"
                              error={
                                errors.date &&
                                formatMessage({ id: errors.date, defaultMessage: errors.date })
                              }
                              required
                            >
                              <Field.Label>
                                {formatMessage({
                                  id: 'content-releases.modal.form.input.label.date',
                                  defaultMessage: 'Date',
                                })}
                              </Field.Label>
                              <DatePicker
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
                                value={values.date ? new Date(values.date) : new Date()}
                                minDate={utcToZonedTime(new Date(), values.timezone.split('&')[1])}
                              />
                              <Field.Error />
                            </Field.Root>
                          </Box>
                          <Box width="100%">
                            <Field.Root
                              name="time"
                              error={
                                errors.time &&
                                formatMessage({ id: errors.time, defaultMessage: errors.time })
                              }
                              required
                            >
                              <Field.Label>
                                {formatMessage({
                                  id: 'content-releases.modal.form.input.label.time',
                                  defaultMessage: 'Time',
                                })}
                              </Field.Label>
                              <TimePicker
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
                              <Field.Error />
                            </Field.Root>
                          </Box>
                        </Flex>
                        <TimezoneComponent timezoneOptions={timezoneList} />
                      </>
                    )}
                  </Flex>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.Close>
                    <Button variant="tertiary" name="cancel">
                      {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                    </Button>
                  </Modal.Close>
                  <Button name="submit" loading={isLoading} type="submit">
                    {formatMessage(
                      {
                        id: 'content-releases.modal.form.button.submit',
                        defaultMessage: '{isCreatingRelease, select, true {Continue} other {Save}}',
                      },
                      { isCreatingRelease: isCreatingRelease }
                    )}
                  </Button>
                </Modal.Footer>
              </Form>
            );
          }}
        </Formik>
      </Modal.Content>
    </Modal.Root>
  );
};

/**
 * Generates the list of timezones and user's current timezone(system timezone)
 */
interface ITimezoneOption {
  offset: string;
  value: string;
}

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
      >
        {timezoneList.map((timezone) => (
          <ComboboxOption key={timezone.value} value={timezone.value}>
            {timezone.value.replace(/&/, ' ')}
          </ComboboxOption>
        ))}
      </Combobox>
      <Field.Error />
    </Field.Root>
  );
};
