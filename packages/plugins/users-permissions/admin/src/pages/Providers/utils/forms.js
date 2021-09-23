import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

import { getTrad } from '../../../utils';

const callbackLabel = {
  id: getTrad('PopUpForm.Providers.redirectURL.front-end.label'),
  defaultMessage: 'The redirect URL to your front-end app',
};
const callbackPlaceholder = {
  id: 'http://www.client-app.com',
  defaultMessage: 'http://www.client-app.com',
};
const enabledDescription = {
  id: getTrad('PopUpForm.Providers.enabled.description'),
  defaultMessage: "If disabled, users won't be able to use this provider.",
};
const enabledLabel = {
  id: getTrad('PopUpForm.Providers.enabled.label'),
  defaultMessage: 'Enable',
};
const keyLabel = { id: getTrad('PopUpForm.Providers.key.label'), defaultMessage: 'Client ID' };
const hintLabel = {
  id: getTrad('PopUpForm.Providers.redirectURL.label'),
  defaultMessage: 'The redirect URL to add in your {provider} application configurations',
  values: {
    provider: 'VK',
  },
};
const textPlaceholder = {
  id: getTrad('PopUpForm.Providers.key.placeholder'),
  defaultMessage: 'TEXT',
};

const secretLabel = {
  id: getTrad('PopUpForm.Providers.secret.label'),
  defaultMessage: 'Client Secret',
};

const forms = {
  email: {
    form: [
      [
        {
          intlLabel: enabledLabel,
          name: 'enabled',
          type: 'bool',
          description: enabledDescription,
          size: 6,
          // TODO check if still needed
          // validations: {
          //   required: true,
          // },
        },
      ],
    ],
    schema: yup.object().shape({
      enabled: yup.bool().required(translatedErrors.required),
    }),
  },
  providers: {
    form: [
      [
        {
          intlLabel: enabledLabel,
          name: 'enabled',
          type: 'bool',
          description: enabledDescription,
          size: 6,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: keyLabel,
          name: 'key',
          type: 'text',
          placeholder: textPlaceholder,
          size: 12,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: secretLabel,
          name: 'secret',
          type: 'text',
          placeholder: textPlaceholder,
          size: 12,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: callbackLabel,
          placeholder: callbackPlaceholder,
          name: 'callback',
          type: 'text',
          size: 12,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: hintLabel,
          name: 'noName',
          type: 'text',
          validations: {},
          size: 12,
          disabled: true,
        },
      ],
    ],
    schema: yup.object().shape({
      enabled: yup.bool().required(translatedErrors.required),
      key: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
      secret: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
      callback: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
    }),
  },
  providersWithSubdomain: {
    form: [
      [
        {
          intlLabel: enabledLabel,
          name: 'enabled',
          type: 'bool',
          description: enabledDescription,
          size: 6,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: keyLabel,
          name: 'key',
          type: 'text',
          placeholder: textPlaceholder,
          size: 12,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: secretLabel,
          name: 'secret',
          type: 'text',
          placeholder: textPlaceholder,
          size: 12,
          validations: {
            required: true,
          },
        },
      ],

      [
        {
          intlLabel: {
            id: getTrad('PopUpForm.Providers.subdomain.label'),
            defaultMessage: 'Host URI (Subdomain)',
          },
          name: 'subdomain',
          type: 'text',
          placeholder: {
            id: getTrad('PopUpForm.Providers.subdomain.placeholder'),
            defaultMessage: 'my.subdomain.com',
          },
          size: 12,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: callbackLabel,
          placeholder: callbackPlaceholder,
          name: 'callback',
          type: 'text',
          size: 12,
          validations: {
            required: true,
          },
        },
      ],
      [
        {
          intlLabel: hintLabel,
          name: 'noName',
          type: 'text',
          validations: {},
          size: 12,
          disabled: true,
        },
      ],
    ],
    schema: yup.object().shape({
      enabled: yup.bool().required(translatedErrors.required),
      key: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
      secret: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
      subdomain: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
      callback: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
    }),
  },
};

export default forms;
