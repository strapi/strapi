import { getTrad } from '../../../utils';

const layout = [
  {
    label: {
      id: getTrad('EditForm.inputToggle.label.email'),
      defaultMessage: 'One account per email address',
    },
    hint: {
      id: getTrad('EditForm.inputToggle.description.email'),
      defaultMessage:
        'Disallow the user to create multiple accounts using the same email address with different authentication providers.',
    },
    name: 'unique_email',
    type: 'boolean',
    size: 12,
  },
  {
    label: {
      id: getTrad('EditForm.inputToggle.label.sign-up'),
      defaultMessage: 'Enable sign-ups',
    },
    hint: {
      id: getTrad('EditForm.inputToggle.description.sign-up'),
      defaultMessage:
        'When disabled (OFF), the registration process is forbidden. No one can subscribe anymore no matter the used provider.',
    },
    name: 'allow_register',
    type: 'boolean',
    size: 12,
  },
  {
    label: {
      id: getTrad('EditForm.inputToggle.label.email-reset-password'),
      defaultMessage: 'Reset password page',
    },
    hint: {
      id: getTrad('EditForm.inputToggle.description.email-reset-password'),
      defaultMessage: "URL of your application's reset password page.",
    },
    placeholder: {
      id: getTrad('EditForm.inputToggle.placeholder.email-reset-password'),
      defaultMessage: 'ex: https://youtfrontend.com/reset-password',
    },
    name: 'email_reset_password',
    type: 'string',
    size: 12,
  },
  {
    label: {
      id: getTrad('EditForm.inputToggle.label.email-confirmation'),
      defaultMessage: 'Enable email confirmation',
    },
    hint: {
      id: getTrad('EditForm.inputToggle.description.email-confirmation'),
      defaultMessage: 'When enabled (ON), new registered users receive a confirmation email.',
    },
    name: 'email_confirmation',
    type: 'boolean',
    size: 12,
  },
  {
    label: {
      id: getTrad('EditForm.inputToggle.label.email-confirmation-redirection'),
      defaultMessage: 'Redirection url',
    },
    hint: {
      id: getTrad('EditForm.inputToggle.description.email-confirmation-redirection'),
      defaultMessage: 'After you confirmed your email, choose where you will be redirected.',
    },
    placeholder: {
      id: getTrad('EditForm.inputToggle.placeholder.email-confirmation-redirection'),
      defaultMessage: 'ex: https://youtfrontend.com/email-confirmation',
    },
    name: 'email_confirmation_redirection',
    type: 'string',
    size: 12,
  },
];

export default layout;
