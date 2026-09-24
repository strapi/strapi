/** Whether this TypeScript program has opted into registered contracts. */
export type IsStrict = Strapi.Registries.Settings extends { strict: true } ? true : false;
