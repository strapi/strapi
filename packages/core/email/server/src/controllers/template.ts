import { errors } from '@strapi/utils';
import type Koa from 'koa';

import type { TemplateContent } from '../../../shared/contracts/templates';
import { buildSampleData } from '../services/render';

const { ApplicationError, ValidationError } = errors;

const DEFAULT_LOCALE = 'en';

const service = () => strapi.plugin('email').service('templates');

const getLocale = (ctx: Koa.Context): string => {
  const { locale } = ctx.query;

  if (locale === undefined) {
    return DEFAULT_LOCALE;
  }

  if (typeof locale !== 'string' || locale.length === 0) {
    throw new ValidationError('locale must be a non-empty string');
  }

  return locale;
};

/** The id of the signed-in admin, for the log lines of changes. */
const adminId = (ctx: Koa.Context): string => String(ctx.state.user?.id ?? 'unknown');

const getBody = (ctx: Koa.Context): TemplateContent => {
  const body = ctx.request.body as Partial<Record<keyof TemplateContent, unknown>> | undefined;

  for (const field of ['subject', 'html', 'text'] as const) {
    if (typeof body?.[field] !== 'string') {
      throw new ValidationError(`${field} must be a string`);
    }
  }

  return body as TemplateContent;
};

const templateController = {
  async list(ctx: Koa.Context) {
    const { prefix } = ctx.query;

    if (prefix !== undefined && typeof prefix !== 'string') {
      throw new ValidationError('prefix must be a string');
    }

    ctx.body = { data: await service().list(prefix) };
  },

  async get(ctx: Koa.Context) {
    ctx.body = { data: await service().get(ctx.params.key, getLocale(ctx)) };
  },

  async update(ctx: Koa.Context) {
    const locale = getLocale(ctx);

    const data = await service().update(ctx.params.key, locale, getBody(ctx));

    strapi.log.info(
      `Email template "${ctx.params.key}" (${locale}) was saved by admin user ${adminId(ctx)}`
    );

    ctx.body = { data };
  },

  async reset(ctx: Koa.Context) {
    const locale = getLocale(ctx);

    await service().reset(ctx.params.key, locale);

    strapi.log.info(
      `Email template "${ctx.params.key}" (${locale}) was reset by admin user ${adminId(ctx)}`
    );

    ctx.body = { data: { ok: true } };
  },

  /**
   * Sends the template to the signed-in admin, filled with sample data from its variable list. With a body
   * (subject, html and text) it sends that content, cleaned and checked like a save, so the editor's unsaved
   * changes can be tried; without one it sends the saved template.
   */
  async test(ctx: Koa.Context) {
    const locale = getLocale(ctx);
    const to = ctx.state.user?.email;

    if (!to) {
      throw new ApplicationError('No recipient for the test email');
    }

    const body = ctx.request.body as Record<string, unknown> | undefined;
    const content = body && Object.keys(body).length > 0 ? getBody(ctx) : undefined;

    const { variables } = await service().get(ctx.params.key, locale);

    try {
      const sample = buildSampleData(variables, service().urlVariables(ctx.params.key));

      await service().sendTemplate(ctx.params.key, to, sample, { locale, content });
    } catch (error) {
      if (error instanceof Error) {
        if ('statusCode' in error && error.statusCode === 400) {
          throw new ApplicationError(error.message);
        }
        throw new Error(`Couldn't send test email: ${error.message}.`);
      }
      throw error;
    }

    ctx.body = { data: { ok: true } };
  },
};

export default templateController;
