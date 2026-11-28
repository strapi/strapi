/**
 * How a Better Auth model (`twoFactor`, `rateLimit`, `jwks`) is named as a Strapi content type: the
 * singular name, which is also the key of the type and the last part of its uid
 * (`plugin::end-users.two-factor`), and the plural name, which the table is named after.
 *
 * The adapter finds the content type of a model by this name and the schema generator creates it,
 * so both read it from here.
 */

/**
 * Models whose Better Auth name is not the singular name of one record. `jwks` is a set of keys, and
 * a record of it is a key: left as it is, the singular and the plural name would both be `jwks`,
 * which the Content-Type Builder refuses and which would give GraphQL one name for the query of a
 * key and the query of the list.
 */
const SINGULAR_NAMES: Readonly<Record<string, string>> = { jwks: 'jwk' };

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

/** `twoFactor` is `two-factor`; `jwks` is `jwk`. */
export const singularNameOf = (model: string): string =>
  SINGULAR_NAMES[model] ?? toKebabCase(model);

/** Never the singular name itself: `jwk` is `jwks`, and a name that already ends in an `s` gets `es`. */
export const pluralNameOf = (singularName: string): string =>
  singularName.endsWith('s') ? `${singularName}es` : `${singularName}s`;
