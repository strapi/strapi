import { pick } from 'lodash';
import { errors } from '@strapi/utils';

import type Koa from 'koa';
import type {} from 'koa-body';
import type { EmailConfig, SendOptions } from '../types';

const { ApplicationError, ValidationError } = errors;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

/**
 * Email.js controller
 *
 * @description: A set of functions called "actions" of the `email` plugin.
 */
const emailController = {
  async send(ctx: Koa.Context) {
    const { body } = ctx.request;

    // The body passes to the provider unchanged: providers accept their own shapes (template
    // sends, recipient arrays, provider options). Only a non-object body is rejected.
    // TODO @Nico enforcing the documented `SendOptions` contract (strings, required `to`,
    // `subject`, `text`) is a breaking change for provider-specific shapes; it needs a future
    // flag or a major release.
    if (isPlainObject(body) === false) {
      throw new ValidationError('The email body must be a JSON object');
    }

    const options = body as SendOptions;

    try {
      await strapi.plugin('email').service('email').send(options);
    } catch (error) {
      if (error instanceof Error) {
        if ('statusCode' in error && error.statusCode === 400) {
          throw new ApplicationError(error.message);
        } else {
          throw new Error(`Couldn't send email: ${error.message}.`);
        }
      }
    }

    // Send 200 `ok`
    ctx.send({});
  },

  async test(ctx: Koa.Context) {
    const { to } = ctx.request.body as Pick<SendOptions, 'to'>;

    if (!to) {
      throw new ApplicationError('No recipient(s) are given');
    }

    const email: SendOptions = {
      to,
      subject: `Strapi test mail to: ${to}`,
      text: `Great! You have correctly configured the Strapi email plugin with the ${strapi.config.get(
        'plugin::email.provider'
      )} provider. \r\nFor documentation on how to use the email plugin checkout: https://docs.strapi.io/developer-docs/latest/plugins/email.html`,
    };

    try {
      await strapi.plugin('email').service('email').send(email);
    } catch (error) {
      if (error instanceof Error) {
        if ('statusCode' in error && error.statusCode === 400) {
          throw new ApplicationError(error.message);
        } else {
          throw new Error(`Couldn't send test email: ${error.message}.`);
        }
      }
    }

    // Send 200 `ok`
    ctx.send({});
  },

  async getSettings(ctx: Koa.Context) {
    const config: EmailConfig = strapi.plugin('email').service('email').getProviderSettings();
    const provider = strapi.plugin('email').provider;

    // Check if provider supports verify method
    const supportsVerify = typeof provider?.verify === 'function';

    // Get capabilities from provider (e.g. SMTP host, auth type, features)
    const capabilities =
      typeof provider?.getCapabilities === 'function' ? provider.getCapabilities() : undefined;

    // Get pool idle status if provider supports it
    const isIdle = typeof provider?.isIdle === 'function' ? provider.isIdle() : undefined;

    ctx.send({
      config: pick(config, [
        'provider',
        'settings.defaultFrom',
        'settings.defaultReplyTo',
        'settings.testAddress',
      ]),
      supportsVerify,
      ...(capabilities ? { capabilities } : {}),
      ...(isIdle !== undefined ? { isIdle } : {}),
    });
  },

  async verify(ctx: Koa.Context) {
    const provider = strapi.plugin('email').provider;

    if (!provider?.verify || typeof provider.verify !== 'function') {
      throw new ApplicationError('This email provider does not support connection verification');
    }

    try {
      await provider.verify();
      ctx.send({ success: true, message: 'SMTP connection verified successfully' });
    } catch (error) {
      if (error instanceof Error) {
        throw new ApplicationError(`Connection verification failed: ${error.message}`);
      }
      throw new ApplicationError('Connection verification failed');
    }
  },
};

export default emailController;
