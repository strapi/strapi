import forgotPasswordTemplate from './email-templates/forgot-password';
import { MFA_DEFAULTS } from './mfa';

export const forgotPassword = {
  emailTemplate: forgotPasswordTemplate,
};

export const auth = {
  mfa: { ...MFA_DEFAULTS, window: { ...MFA_DEFAULTS.window } },
};

export default {
  forgotPassword,
  auth,
};
