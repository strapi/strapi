import type { ContentTypeSchema } from '@strapi/strapi';
import type { ISourceProvider, ProviderType } from '../../types';

import { Duplex, PassThrough, Readable } from 'stream';
import { chain } from 'stream-chain';

export interface ILocalStrapiSourceProviderOptions {
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>;

  autoDestroy?: boolean;
}

export const createLocalStrapiSourceProvider = (options: ILocalStrapiSourceProviderOptions) => {
  return new LocalStrapiSourceProvider(options);
};

class LocalStrapiSourceProvider implements ISourceProvider {
  name: string = 'source::local-strapi';
  type: ProviderType = 'source';

  options: ILocalStrapiSourceProviderOptions;
  strapi?: Strapi.Strapi;

  constructor(options: ILocalStrapiSourceProviderOptions) {
    this.options = options;
  }

  async bootstrap(): Promise<void> {
    this.strapi = await this.options.getStrapi();
  }

  async close(): Promise<void> {
    if (!this.strapi) {
      return;
    }

    const { autoDestroy } = this.options;

    // Basically `!== false` but more deterministic
    if (autoDestroy === undefined || autoDestroy === true) {
      await this.strapi.destroy();
    }
  }

  // TODO: Implement the get metadata
  async getMetadata() {
    return null;
  }

  async streamEntities(): Promise<NodeJS.ReadableStream> {
    if (!this.strapi) {
      throw new Error('Not able to stream entities. Strapi instance not found');
    }

    /**
     * Transform raw entities into "Strapi Data Transfer Format"
     */
    const transformStream = new PassThrough({
      objectMode: true,
      transform(data, _encoding, callback) {
        const { entity, contentType } = data;
        const { id, ...attributes } = entity;

        callback(null, {
          type: contentType.uid,
          id,
          data: attributes,
        });
      },
    });

    // Create a stream composed of multiple content types stream
    const entitiesStream = await createMultiContentTypesStream(this.strapi);

    return chain([
      // Entities
      entitiesStream,
      // Transform to the wanted format
      transformStream,
    ]);
  }
}

/**
 * Create a stream that iterates over each content-type registered
 * in the Strapi instance and returns all of their entities one by one.
 */
const createMultiContentTypesStream = async (strapi: Strapi.Strapi): Promise<Duplex> => {
  const contentTypes: any[] = Object.values(strapi.contentTypes);

  const getNextContentTypeStream = async (): Promise<Partial<[Readable, ContentTypeSchema]>> => {
    const contentType = contentTypes.pop();

    if (!contentType) {
      return [undefined, undefined];
    }

    const stream = await getContentTypeStream(strapi, contentType);

    return [stream, contentType];
  };

  return Duplex.from(async function* () {
    let [stream, contentType] = await getNextContentTypeStream();

    while (stream && contentType) {
      for await (const entity of stream) {
        yield { entity, contentType };
      }

      stream.destroy();

      [stream, contentType] = await getNextContentTypeStream();
    }
  });
};

/**
 * Generate an entity stream for a given content type
 */
const getContentTypeStream = (strapi: Strapi.Strapi, contentType: ContentTypeSchema) => {
  const { attributes } = contentType;

  const populateAttributes = Object.keys(attributes).filter((key) =>
    ['component', 'dynamiczone'].includes(attributes[key].type)
  );

  return (
    strapi.db
      // Create a query builder instance (default type is 'select')
      .queryBuilder(contentType.uid)
      // Apply the populate
      .populate(populateAttributes)
      // Get a readable stream
      .stream()
  );
};
