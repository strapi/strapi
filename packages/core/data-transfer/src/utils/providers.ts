import { ProviderInitializationError } from '../errors/providers';

export type ValidStrapiAssertion = (
  strapi: unknown,
  msg?: string
) => asserts strapi is Strapi.Strapi;

export const assertValidStrapi: ValidStrapiAssertion = (strapi?: unknown, msg = '') => {
  if (!strapi) {
    throw new ProviderInitializationError(`${msg}. Strapi instance not found.`);
  }
};
