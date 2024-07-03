import { translatedErrors } from '@strapi/admin/strapi-admin';
import { parse, isToday } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

/**
 * FormikErrors type enforce us to always return a string as error.
 * We need these errors to be translated, so we need to create a hook to be able to use the formatMessage function.
 */
export const useTranslatedSchema = () => {
  const { formatMessage } = useIntl();

  return {
    RELEASE_SCHEMA: yup
      .object()
      .shape({
        name: yup
          .string()
          .trim()
          .required(
            formatMessage({
              id: translatedErrors.required.id,
              defaultMessage: 'This field is required',
            })
          ),
        scheduledAt: yup.string().nullable(),
        isScheduled: yup.boolean().optional(),
        time: yup
          .string()
          .when('isScheduled', {
            is: true,
            then: yup
              .string()
              .trim()
              .required(
                formatMessage({
                  id: translatedErrors.required.id,
                  defaultMessage: 'This field is required',
                })
              ),
            otherwise: yup.string().nullable(),
          })
          .test(
            'time-in-future-if-today',
            formatMessage({
              id: 'content-releases.modal.form.time.has-passed',
              defaultMessage: 'Selected time has already passed.',
            }),
            function (time) {
              const { date, timezone } = this.parent;

              if (!date || !timezone || !time) {
                return true;
              }

              // Timezone is in format "UTC&Europe/Paris", so we get the region part for the dates functions
              const region = timezone.split('&')[1];

              const now = new Date();
              const selectedDate = parse(date, 'yyyy-MM-dd', new Date());
              const selectedDateTimeString = `${date} ${time}`;
              const selectedZonedDateTime = utcToZonedTime(selectedDateTimeString, region);

              if (isToday(selectedDate)) {
                const nowInSelectedTimezone = utcToZonedTime(now, region);
                return selectedZonedDateTime > nowInSelectedTimezone;
              }

              return true;
            }
          ),
        timezone: yup.string().when('isScheduled', {
          is: true,
          then: yup
            .string()
            .required(
              formatMessage({
                id: translatedErrors.required.id,
                defaultMessage: 'This field is required',
              })
            )
            .nullable(),
          otherwise: yup.string().nullable(),
        }),
        date: yup.string().when('isScheduled', {
          is: true,
          then: yup
            .string()
            .required(
              formatMessage({
                id: translatedErrors.required.id,
                defaultMessage: 'This field is required',
              })
            )
            .nullable(),
          otherwise: yup.string().nullable(),
        }),
      })
      .required()
      .noUnknown(),
  };
};

export const SETTINGS_SCHEMA = yup
  .object()
  .shape({
    defaultTimezone: yup.string().nullable().default(null),
  })
  .required()
  .noUnknown();
