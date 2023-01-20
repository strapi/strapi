import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

import { getTrad } from '../../../utils';

const replaceFields = (list, fields) =>
  list.map((items) => items.map((field) => ({ ...field, ...fields[field.name] })));

const insertFields = (list, index, ...items) => [
  ...list.slice(0, index),
  ...items,
  ...list.slice(index),
];

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
};
const textPlaceholder = {
  id: getTrad('PopUpForm.Providers.key.placeholder'),
  defaultMessage: 'TEXT',
};
const secretLabel = {
  id: getTrad('PopUpForm.Providers.secret.label'),
  defaultMessage: 'Client Secret',
};
const teamIdLabel = {
  id: getTrad('PopUpForm.Providers.apple.teamId'),
  defaultMessage: 'Team ID',
};
const keyIdentifierLabel = {
  id: getTrad('PopUpForm.Providers.apple.keyIdentifier'),
  defaultMessage: 'Key ID',
};
const privateKeyPlaceholder = {
  id: getTrad('PopUpForm.Providers.privateKey.placeholder'),
  defaultMessage: `\
-----BEGIN PRIVATE KEY-----
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAA
-----END PRIVATE KEY-----`,
};

const commonFields = [
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
];

const commonSchema = {
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
};

const BEFORE_CALLBACK_INDEX = commonFields.findIndex(([{ name }]) => name === 'callback');

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
    form: commonFields,
    schema: yup.object().shape({ ...commonSchema }),
  },

  providersWithSubdomain: {
    form: insertFields(commonFields, BEFORE_CALLBACK_INDEX, [
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
    ]),
    schema: yup.object().shape({
      ...commonSchema,
      subdomain: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
    }),
  },

  providerApple: {
    form: insertFields(
      replaceFields(commonFields, {
        secret: {
          type: 'textarea',
          placeholder: privateKeyPlaceholder,
        },
      }),
      BEFORE_CALLBACK_INDEX,
      [
        {
          intlLabel: teamIdLabel,
          name: 'teamId',
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
          intlLabel: keyIdentifierLabel,
          name: 'keyIdentifier',
          type: 'text',
          placeholder: textPlaceholder,
          size: 12,
          validations: {
            required: true,
          },
        },
      ]
    ),
    schema: yup.object().shape({
      ...commonSchema,
      teamId: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
      keyIdentifier: yup.string().when('enabled', {
        is: true,
        then: yup.string().required(translatedErrors.required),
        otherwise: yup.string(),
      }),
    }),
  },
};

export default forms;
