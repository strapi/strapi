import { Readable } from 'stream';

/**
 * Collect every entity in a Readable stream
 */
export const collect = <T = unknown>(stream: Readable): Promise<T[]> => {
  const chunks: T[] = [];

  return new Promise((resolve, reject) => {
    stream
      .on('data', (chunk) => chunks.push(chunk))
      .on('close', () => {
        resolve(chunks);
      })
      .on('error', reject);
  });
};

/**
 * Create a "Strapi" like object factory based on the
 * given params and cast it to the correct type
 */
export const getStrapiFactory =
  <
    T extends {
      [key in keyof Partial<Strapi.Strapi>]: unknown;
    }
  >(
    properties?: T
  ) =>
  (additionalProperties?: T) => {
    return { ...properties, ...additionalProperties } as Strapi.Strapi;
  };

/**
 * Union type used to represent the default content types available
 */
export type ContentType = 'foo' | 'bar';

/**
 * Factory to get default content types test values
 */
export const getContentTypes = (): {
  [key in ContentType]: { uid: key; attributes: { [attribute: string]: unknown } };
} => ({
  foo: { uid: 'foo', attributes: { title: { type: 'string' } } },
  bar: { uid: 'bar', attributes: { age: { type: 'number' } } },
});

/**
 * Create a factory of readable streams (wrapped with a jest mock function)
 */
export const createMockedReadableFactory = <T extends string = ContentType>(source: {
  [ct in T]: Array<{ id: number; [key: string]: unknown }>;
}) =>
  jest.fn((uid: T) => {
    return Readable.from(source[uid] || []);
  });

/**
 * Create a factory of mocked query builders
 */
export const createMockedQueryBuilder = <T extends string = ContentType>(data: {
  [key in T]: unknown[];
}) =>
  jest.fn((uid: T) => {
    const state: { [key: string]: unknown } = { populate: undefined };

    return {
      populate(populate: unknown) {
        state.populate = populate;
        return this;
      },
      stream() {
        return Readable.from(data[uid]);
      },
    };
  });
