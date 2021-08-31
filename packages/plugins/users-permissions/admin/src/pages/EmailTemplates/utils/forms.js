import React from 'react';
import { FormattedMessage } from 'react-intl';
import { getTrad } from '../../../utils';
import CustomTextInput from '../CustomTextInput';

const forms = [
  {
    autoFocus: true,
    label: getTrad('PopUpForm.Email.options.from.name.label'),
    name: 'options.from.name',
    type: 'text',
    placeholder: getTrad('PopUpForm.Email.options.from.name.placeholder'),
    size: { xs: 6 },
    validations: {
      required: true,
    },
  },
  {
    autoFocus: false,
    label: getTrad('PopUpForm.Email.options.from.email.label'),
    name: 'options.from.email',
    type: 'email',
    placeholder: getTrad('PopUpForm.Email.options.from.email.placeholder'),
    size: { xs: 6 },
    validations: {
      required: true,
    },
  },
  {
    autoFocus: false,
    label: getTrad('PopUpForm.Email.options.response_email.label'),
    name: 'options.response_email',
    type: 'email',
    placeholder: getTrad('PopUpForm.Email.options.response_email.placeholder'),
    size: { xs: 6 },
    validations: {
      required: true,
    },
  },
  {
    autoFocus: false,
    label: getTrad('PopUpForm.Email.options.object.label'),
    name: 'options.object',
    type: 'customText',
    placeholder: getTrad('PopUpForm.Email.options.object.placeholder'),
    customInputs: { customText: CustomTextInput },
    descriptione: () => (
      <FormattedMessage
        id={getTrad('PopUpForm.Email.email_templates.inputDescription')}
        values={{
          link: (
            <a
              href="https://strapi.io/documentation/developer-docs/latest/development/plugins/users-permissions.html#templating-emails"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id={getTrad('PopUpForm.Email.link.documentation')} />
            </a>
          ),
        }}
      />
    ),
    size: { xs: 6 },
    validations: {
      required: true,
    },
  },
  {
    autoFocus: false,
    label: getTrad('PopUpForm.Email.options.message.label'),
    name: 'options.message',
    type: 'textarea',
    style: { height: '15.6rem' },
    size: { xs: 12 },
    validations: {
      required: true,
    },
  },
];

export default forms;
