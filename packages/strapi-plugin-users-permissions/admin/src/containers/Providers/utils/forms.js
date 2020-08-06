import { getTrad } from '../../../utils';

const forms = {
  email: {
    form: [
      {
        autoFocus: true,
        label: getTrad('PopUpForm.Providers.enabled.label'),
        name: 'enabled',
        type: 'bool',
        description: getTrad('PopUpForm.Providers.enabled.description'),
        size: { xs: 6 },
        validations: {
          required: true,
        },
      },
    ],
  },
  providers: {
    form: [
      {
        autoFocus: true,
        label: getTrad('PopUpForm.Providers.enabled.label'),
        name: 'enabled',
        type: 'bool',
        description: getTrad('PopUpForm.Providers.enabled.description'),
        size: { xs: 6 },
        validations: {
          required: true,
        },
      },
      {
        autoFocus: false,
        label: getTrad('PopUpForm.Providers.key.label'),
        name: 'key',
        type: 'text',
        placeholder: getTrad('PopUpForm.Providers.key.placeholder'),
        size: { xs: 12 },
        validations: {
          required: true,
        },
      },
      {
        autoFocus: false,
        label: getTrad('PopUpForm.Providers.secret.label'),
        name: 'secret',
        type: 'text',
        placeholder: getTrad('PopUpForm.Providers.secret.placeholder'),
        size: { xs: 12 },
        validations: {
          required: true,
        },
      },
      {
        autoFocus: false,
        label: getTrad('PopUpForm.Providers.redirectURL.front-end.label'),
        placeholder: 'http://www.client-app.com',
        name: 'callback',
        type: 'text',
        size: { xs: 12 },
        validations: {
          required: true,
        },
      },
      {
        label: {
          id: getTrad('PopUpForm.Providers.redirectURL.label'),
          params: {
            provider: 'VK',
          },
        },
        name: 'noName',
        type: 'text',
        validations: {},
        size: {
          xs: 12,
        },
        disabled: true,
      },
    ],
  },
};

export default forms;
