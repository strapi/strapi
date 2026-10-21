import * as _ from 'lodash';
import { objects, template } from '@strapi/utils';

import type { Providers } from '@strapi/types';
import type {
  EmailConfig,
  EmailOptions,
  EmailTemplate,
  EmailTemplateData,
  SendOptions,
} from '../types';

const { createStrictInterpolationRegExp } = template;

const getProviderSettings = (): EmailConfig => strapi.config.get('plugin::email');

const getProvider = (): Providers.Email.Provider => strapi.plugin('email').provider;

const send = async (options: SendOptions) => getProvider().send(options);

/**
 * fill subject, text and html using lodash template
 * @param {object} emailOptions - to, from and replyto...
 * @param {object} emailTemplate - object containing attributes to fill
 * @param {object} data - data used to fill the template
 * @returns {{ subject, text, subject }}
 */
const sendTemplatedEmail = (
  emailOptions: EmailOptions,
  emailTemplate: EmailTemplate,
  data: EmailTemplateData
) => {
  const attributes = ['subject', 'text', 'html'];
  const missingAttributes = _.difference(attributes, Object.keys(emailTemplate));

  if (missingAttributes.length > 0) {
    throw new Error(
      `Following attributes are missing from your email template : ${missingAttributes.join(', ')}`
    );
  }

  const allowedInterpolationVariables = objects.keysDeep(data);
  const interpolate = createStrictInterpolationRegExp(allowedInterpolationVariables, 'g');

  const compile = (value: string) => _.template(value, { interpolate })(data);

  const templatedAttributes = {
    subject: compile(emailTemplate.subject),
    text: compile(emailTemplate.text),
    ...(emailTemplate.html ? { html: compile(emailTemplate.html) } : {}),
  };

  return getProvider().send({ ...emailOptions, ...templatedAttributes });
};

const emailService = () => ({
  getProvider,
  getProviderSettings,
  send,
  sendTemplatedEmail,
});

export default emailService;
