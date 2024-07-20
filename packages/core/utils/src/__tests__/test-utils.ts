import type { LoadedStrapi } from '@strapi/types';

/**
 * Update the global store with the given strapi value
 */
export const setGlobalStrapi = (strapi: LoadedStrapi): void => {
  (global as unknown as Global).strapi = strapi;
};

/**
 * Create a "Strapi" like object factory based on the
 * given params and cast it to the correct type
 */
export const getStrapiFactory =
  <
    T extends {
      [key in keyof Partial<LoadedStrapi>]: unknown;
    }
  >(
    properties?: T
  ) =>
  (additionalProperties?: Partial<T>) => {
    return { ...properties, ...additionalProperties } as LoadedStrapi;
  };
