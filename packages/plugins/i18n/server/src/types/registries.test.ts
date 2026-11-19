// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { LocaleSchema } from './content-types';

// i18n declares the schema of its locale content type: the Document Service reads it without type
// generation.
const locale = await strapi.documents('plugin::i18n.locale').findFirst({ fields: ['code'] });
if (locale !== null) {
  locale.code satisfies string | null | undefined;
  // @ts-expect-error Only the selected fields are read.
  locale.name satisfies unknown;
}
const locales = await strapi.documents('plugin::i18n.locale').findMany();
locales[0]?.name satisfies string | null | undefined;
locales[0]?.createdAt satisfies string | null | undefined;
// @ts-expect-error Not an attribute of plugin::i18n.locale.
locales[0]?.missing satisfies unknown;
// @ts-expect-error Filters are checked against the declared schema.
strapi.documents('plugin::i18n.locale').findMany({ filters: { missing: { $eq: 'en' } } });

strapi.getModel('plugin::i18n.locale').attributes.code satisfies LocaleSchema['attributes']['code'];
// @ts-expect-error Not an attribute of plugin::i18n.locale.
strapi.getModel('plugin::i18n.locale').attributes.missing satisfies unknown;

// Content types no package declares stay generic.
strapi.documents('api::article.article').findMany({ filters: { anything: { $eq: 1 } } });
