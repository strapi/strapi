import { ProviderInitializationError } from '../errors/providers';

export type ValidStrapiAssertion = (
  strapi: unknown,
  msg?: string
) => asserts strapi is Strapi.Strapi;

export const assertValidStrapi: ValidStrapiAssertion = (
  strapi?: unknown,
  msg = ''
): asserts strapi => {
  if (!strapi) {
    throw new ProviderInitializationError(`Strapi instance not found. ${msg}`);
  }
};
