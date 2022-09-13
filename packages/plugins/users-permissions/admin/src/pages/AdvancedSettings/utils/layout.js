import { getTrad } from '../../../utils';

const layout = [
  {
    intlLabel: {
      id: getTrad('EditForm.inputToggle.label.email'),
      defaultMessage: 'One account per email address',
    },
    description: {
      id: getTrad('EditForm.inputToggle.description.email'),
      defaultMessage:
        'Disallow the user to create multiple accounts using the same email address with different authentication providers.',
    },
    name: 'unique_email',
    type: 'bool',
    size: {
      col: 12,
      xs: 12,
    },
  },
  {
    intlLabel: {
      id: getTrad('EditForm.inputToggle.label.sign-up'),
      defaultMessage: 'Enable sign-ups',
    },
    description: {
      id: getTrad('EditForm.inputToggle.description.sign-up'),
      defaultMessage:
        'When disabled (OFF), the registration process is forbidden. No one can subscribe anymore no matter the used provider.',
    },
    name: 'allow_register',
    type: 'bool',
    size: {
      col: 12,
      xs: 12,
    },
  },
  {
    intlLabel: {
      id: getTrad('EditForm.inputToggle.label.email-reset-password'),
      defaultMessage: 'Reset password page',
    },
    description: {
      id: getTrad('EditForm.inputToggle.description.email-reset-password'),
      defaultMessage: "URL of your application's reset password page.",
    },
    placeholder: {
      id: getTrad('EditForm.inputToggle.placeholder.email-reset-password'),
      defaultMessage: 'ex: https://youtfrontend.com/reset-password',
    },
    name: 'email_reset_password',
    type: 'text',
    size: {
      col: 6,
      xs: 12,
    },
  },
  {
    intlLabel: {
      id: getTrad('EditForm.inputToggle.label.email-confirmation'),
      defaultMessage: 'Enable email confirmation',
    },
    description: {
      id: getTrad('EditForm.inputToggle.description.email-confirmation'),
      defaultMessage: 'When enabled (ON), new registered users receive a confirmation email.',
    },
    name: 'email_confirmation',
    type: 'bool',
    size: {
      col: 12,
      xs: 12,
    },
  },
  {
    intlLabel: {
      id: getTrad('EditForm.inputToggle.label.email-confirmation-redirection'),
      defaultMessage: 'Redirection url',
    },
    description: {
      id: getTrad('EditForm.inputToggle.description.email-confirmation-redirection'),
      defaultMessage: 'After you confirmed your email, choose where you will be redirected.',
    },
    placeholder: {
      id: getTrad('EditForm.inputToggle.placeholder.email-confirmation-redirection'),
      defaultMessage: 'ex: https://youtfrontend.com/email-confirmation',
    },
    name: 'email_confirmation_redirection',
    type: 'text',
    size: {
      col: 6,
      xs: 12,
    },
  },
];

export default layout;
