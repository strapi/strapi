import { translatedErrors } from '@strapi/admin/strapi-admin';
import { zonedTimeToUtc } from 'date-fns-tz';
import * as yup from 'yup';

/**
 * FormikErrors type enforce us to always return a string as error.
 * We need these errors to be translated, so we need to create a hook to be able to use the formatMessage function.
 */
export const RELEASE_SCHEMA = yup
  .object()
  .shape({
    name: yup.string().trim().required(translatedErrors.required.id).nullable(),
    scheduledAt: yup.string().nullable(),
    isScheduled: yup.boolean().optional(),
    time: yup
      .string()
      .when('isScheduled', {
        is: true,
        then: yup.string().trim().required(translatedErrors.required.id),
        otherwise: yup.string().nullable(),
      })
      .test(
        'time-in-future-if-today',
        'content-releases.modal.form.time.has-passed',
        function (time) {
          const { date, timezone } = this.parent;

          if (!date || !timezone || !time) {
            return true;
          }

          // Timezone is in format "UTC&Europe/Paris", so we get the region part for the dates functions
          const region = timezone.split('&')[1];

          const selectedTime = zonedTimeToUtc(`${date} ${time}`, region);
          const now = new Date();

          return selectedTime > now;
        }
      ),
    timezone: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().required(translatedErrors.required.id).nullable(),
      otherwise: yup.string().nullable(),
    }),
    date: yup.string().when('isScheduled', {
      is: true,
      then: yup.string().required(translatedErrors.required.id).nullable(),
      otherwise: yup.string().nullable(),
    }),
  })
  .required()
  .noUnknown();

export const SETTINGS_SCHEMA = yup
  .object()
  .shape({
    defaultTimezone: yup.string().nullable().default(null),
  })
  .required()
  .noUnknown();
