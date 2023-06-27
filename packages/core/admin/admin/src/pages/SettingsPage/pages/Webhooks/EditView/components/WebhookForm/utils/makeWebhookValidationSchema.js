import * as yup from 'yup';

const NAME_REGEX = /(^$)|(^[A-Za-z][_0-9A-Za-z ]*$)/;
const URL_REGEX = /(^$)|((https?:\/\/.*)(d*)\/?(.*))/;

export const makeWebhookValidationSchema = ({ formatMessage }) =>
  yup.object().shape({
    name: yup
      .string()
      .required(
        formatMessage({
          id: 'Settings.webhooks.validation.name.required',
          defaultMessage: 'Name is required',
        })
      )
      .matches(
        NAME_REGEX,
        formatMessage({
          id: 'Settings.webhooks.validation.name.regex',
          defaultMessage:
            'The name must start with a letter and only contain letters, numbers, spaces and underscores',
        })
      ),
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
          id: 'Settings.webhooks.validation.url.regex',
          defaultMessage: 'The value must be a valid Url',
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
