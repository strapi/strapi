import { SchemaOption } from '@strapi/content-type-builder/strapi-admin';

interface SchemaLike {
  pluginOptions?: { i18n?: { localized?: boolean } };
}

export const isLocalized = (schema: unknown): boolean =>
  (schema as SchemaLike)?.pluginOptions?.i18n?.localized === true;

/**
 * The "Internationalization" cell of the schema index. A content type is either
 * translated or it is not, and that has been invisible outside the settings
 * modal — which is the whole reason the index exists.
 *
 * Drawn by the builder so that an option i18n owns looks like an option the
 * builder owns; a column of ticks beside a column of words reads as two
 * different questions.
 */
export const LocalizedCell = ({ schema }: { schema: unknown }) => (
  <SchemaOption on={isLocalized(schema)} />
);
