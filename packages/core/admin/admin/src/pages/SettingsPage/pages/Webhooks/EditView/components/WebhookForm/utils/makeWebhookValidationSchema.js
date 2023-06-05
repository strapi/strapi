import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const NAME_REGEX = /(^$)|(^[A-Za-z][_0-9A-Za-z ]*$)/;
const URL_REGEX = /(^$)|((https?:\/\/.*)(d*)\/?(.*))/;

export const makeWebhookValidationSchema = ({ formatMessage }) =>
  yup.object().shape({
    name: yup
      .string()
      .required(
        formatMessage({
          id: 'Settings.webhooks.validation.name',
          defaultMessage: 'Name is required',
        })
      )
      .matches(NAME_REGEX, translatedErrors.regex),
    url: yup
      .string()
      .required(
        formatMessage({
          id: 'Settings.webhooks.validation.url.required',
          defaultMessage: 'Url is required',
        })
      )
      .matches(
        URL_REGEX,
        formatMessage({
          id: translatedErrors.regex,
          defaultMessage: 'The value does not match the regex',
        })
      ),
    headers: yup.lazy((array) => {
      let baseSchema = yup.array();

      if (array.length === 1) {
        const { key, value } = array[0];

        if (!key && !value) {
          return baseSchema;
        }
      }

      return baseSchema.of(
        yup.object().shape({
          key: yup.string().required(
            formatMessage({
              id: 'Settings.webhooks.validation.key',
              defaultMessage: 'Key is required',
            })
          ),
          value: yup.string().required(
            formatMessage({
              id: 'Settings.webhooks.validation.value',
              defaultMessage: 'Value is required',
            })
          ),
        })
      );
    }),
    events: yup.array(),
  });
