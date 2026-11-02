/**
 * A type used as the identifier for an entry.
 * Applications can replace it through `Strapi.Registries.Identifiers['id']`.
 */
export type ID = Strapi.Registries.Identifiers extends { id: infer T extends string | number }
  ? T
  : string | number;
