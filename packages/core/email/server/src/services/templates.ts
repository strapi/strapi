import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import type {
  TemplateContent,
  TemplateDefinition,
  TemplateDetail,
  TemplateSummary,
} from '../../../shared/contracts/templates';
import { TEMPLATE_UID } from '../constants';
import { render } from './render';
import { cleanTemplateHtml, findMisplacedSecrets } from './sanitize';

/** Plain code-unit order, the same order `Array.prototype.sort` gives strings by default. */
const byCodeUnit = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const { ApplicationError, NotFoundError, ValidationError } = errors;

const DEFAULT_LOCALE = 'en';
const MAX_LOCALE_LENGTH = 16;
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** `{{ a }}, {{ b }}`: the variables as they are written in a template. */
const placeholders = (names: string[]): string => names.map((name) => `{{ ${name} }}`).join(', ');

const assertLocale = (locale: string) => {
  if (
    typeof locale !== 'string' ||
    locale.length > MAX_LOCALE_LENGTH ||
    !LOCALE_PATTERN.test(locale)
  ) {
    throw new ValidationError('locale must be a locale code such as "en" or "pt-BR"');
  }
};

interface TemplateRow extends TemplateContent {
  key: string;
  locale: string;
}

/**
 * A registered template: the definition with its variables as names, which of them are secret, and which may
 * start a link (the secret ones and those declared as URLs).
 */
interface RegisteredTemplate extends Omit<TemplateDefinition, 'variables'> {
  variables: string[];
  secrets: string[];
  urls: string[];
}

const templatesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const registry = new Map<string, RegisteredTemplate>();

  const query = () => strapi.db.query(TEMPLATE_UID);

  const getDefinition = (key: string) => {
    const definition = registry.get(key);

    if (!definition) {
      throw new NotFoundError(`Unknown email template "${key}"`);
    }

    return definition;
  };

  const findRows = async (key: string): Promise<TemplateRow[]> =>
    query().findMany({ where: { key } });

  const toDetail = (
    key: string,
    locale: string,
    definition: RegisteredTemplate,
    row?: TemplateRow
  ): TemplateDetail => {
    const content = row ?? definition.defaults;

    return {
      key,
      locale,
      subject: content.subject ?? '',
      html: content.html ?? '',
      text: content.text ?? '',
      variables: [...definition.variables],
      isDefault: !row,
    };
  };

  /**
   * Cleans the HTML, then checks and returns that same string, so what is checked is exactly what is stored
   * or sent. Refuses a secret variable where it could leak.
   */
  const cleanAndCheck = (
    definition: RegisteredTemplate,
    body: TemplateContent
  ): TemplateContent => {
    const html = cleanTemplateHtml(body.html, definition.urls);
    const misplaced = findMisplacedSecrets(html, definition.secrets);

    if (misplaced.length > 0) {
      throw new ValidationError(
        `The HTML puts ${placeholders(misplaced)} where it could leak: ` +
          'a variable that carries a secret may only appear in text or at the start of a link (<a href="{{ … }}">)'
      );
    }

    return { subject: body.subject, html, text: body.text };
  };

  /** The stored row for the locale, else the `en` row, else the registered defaults. */
  const get = async (key: string, locale: string = DEFAULT_LOCALE): Promise<TemplateDetail> => {
    assertLocale(locale);
    const definition = getDefinition(key);
    const rows = await findRows(key);
    const row =
      rows.find((candidate) => candidate.locale === locale) ??
      rows.find((candidate) => candidate.locale === DEFAULT_LOCALE);

    return toDetail(key, locale, definition, row);
  };

  return {
    /** Registers a template and its defaults. Only possible while Strapi is loading. */
    register(key: string, definition: TemplateDefinition): void {
      if (strapi.isLoaded) {
        throw new ApplicationError(
          `Email template "${key}" must be registered in register() or bootstrap()`
        );
      }

      if (registry.has(key)) {
        throw new ApplicationError(`Email template "${key}" is already registered`);
      }

      const declared = definition.variables.map((variable) =>
        typeof variable === 'string' ? { name: variable } : variable
      );

      registry.set(key, {
        ...definition,
        defaults: { ...definition.defaults },
        variables: declared.map(({ name }) => name),
        secrets: declared.filter(({ secret }) => secret).map(({ name }) => name),
        urls: declared.filter(({ secret, url }) => secret || url).map(({ name }) => name),
      });
    },

    /** The variables of a template that stand for a URL: the ones declared as URLs, and the secret ones. */
    urlVariables(key: string): string[] {
      return [...getDefinition(key).urls];
    },

    async list(prefix?: string): Promise<TemplateSummary[]> {
      const keys = [...registry.keys()]
        .filter((key) => (prefix ? key.startsWith(prefix) : true))
        .sort(byCodeUnit);

      if (keys.length === 0) {
        return [];
      }

      const rows: TemplateRow[] = await query().findMany({ where: { key: { $in: keys } } });

      return keys.map((key) => {
        const locales = rows.filter((row) => row.key === key).map((row) => row.locale);

        return {
          key,
          description: registry.get(key)?.description ?? '',
          locales: [...new Set([DEFAULT_LOCALE, ...locales])].sort(byCodeUnit),
          customized: locales.length > 0,
        };
      });
    },

    get,

    async update(key: string, locale: string, body: TemplateContent): Promise<TemplateDetail> {
      assertLocale(locale);
      const definition = getDefinition(key);
      const data = cleanAndCheck(definition, body);

      const existing = await query().findOne({ where: { key, locale } });

      if (existing) {
        await query().update({ where: { id: existing.id }, data });
      } else {
        await query().create({ data: { key, locale, ...data } });
      }

      return toDetail(key, locale, definition, { key, locale, ...data });
    },

    async reset(key: string, locale: string): Promise<void> {
      assertLocale(locale);
      getDefinition(key);

      await query().deleteMany({ where: { key, locale } });
    },

    async sendTemplate(
      key: string,
      to: string,
      data: Record<string, unknown>,
      opts: { locale?: string; content?: TemplateContent } = {}
    ): Promise<void> {
      const definition = getDefinition(key);
      let template = await get(key, opts.locale);

      // Content that was not saved (a test email from the editor) is cleaned and checked like a save.
      if (opts.content) {
        template = { ...template, ...cleanAndCheck(definition, opts.content), isDefault: false };
      }

      // Rows saved before the save-time checks, or written without them, are checked again here.
      // A row whose HTML the cleaning would change (a tag left open, say, which a browser reads
      // differently from the way it is split here) is not one that can be checked, so it is not sent.
      if (!template.isDefault && !opts.content) {
        const misplaced = findMisplacedSecrets(template.html, definition.secrets);
        const unclean = cleanTemplateHtml(template.html, definition.urls) !== template.html;

        if (misplaced.length > 0 || unclean) {
          strapi.log.warn(
            misplaced.length > 0
              ? `Email template "${key}" puts ${placeholders(misplaced)} where it could leak, so the registered default is sent instead`
              : `Email template "${key}" holds HTML that was not cleaned, so the registered default is sent instead`
          );
          template = toDetail(key, template.locale, definition);
        }
      }

      await strapi
        .plugin('email')
        .service('email')
        .send({
          to,
          // A variable value can carry line breaks, which would let it add headers to the message.
          subject: render(template.subject, template.variables, data, 'text').replace(
            /[\r\n]/g,
            ''
          ),
          html: render(template.html, template.variables, data, 'html'),
          text: render(template.text, template.variables, data, 'text'),
        });
    },
  };
};

export default templatesService;
