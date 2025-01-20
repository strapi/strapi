import { getTrad } from '../../../utils';

const createField = ({ id, defaultMessage, name, type = 'string', size = 12, placeholder }) => ({
  label: {
    id: getTrad(`EditForm.inputToggle.label.${id}`),
    defaultMessage,
  },
  hint: {
    id: getTrad(`EditForm.inputToggle.description.${id}`),
    defaultMessage: `Description for ${defaultMessage}`,
  },
  name,
  type,
  size,
  ...(placeholder && {
    placeholder: {
      id: getTrad(`EditForm.inputToggle.placeholder.${id}`),
      defaultMessage: placeholder,
    },
  }),
});

const layout = [
  createField({
    id: 'email',
    defaultMessage: 'One account per email address',
    name: 'unique_email',
    type: 'boolean',
  }),
  createField({
    id: 'sign-up',
    defaultMessage: 'Enable sign-ups',
    name: 'allow_register',
    type: 'boolean',
  }),
  createField({
    id: 'email-reset-password',
    defaultMessage: 'Reset password page',
    name: 'email_reset_password',
    placeholder: 'ex: https://youtfrontend.com/reset-password',
  }),
  createField({
    id: 'email-confirmation',
    defaultMessage: 'Enable email confirmation',
    name: 'email_confirmation',
    type: 'boolean',
  }),
  createField({
    id: 'email-confirmation-redirection',
    defaultMessage: 'Redirection url',
    name: 'email_confirmation_redirection',
    placeholder: 'ex: https://youtfrontend.com/email-confirmation',
  }),
  createField({
    id: 'email-confirmation-error-redirection',
    defaultMessage: 'Email confirmation error redirect url',
    name: 'email_confirmation_error_redirection',
    placeholder: 'e.g. https://yourfrontend.com/email-confirmation-error',
  }),
];

export default layout;
