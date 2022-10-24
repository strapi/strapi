import type { ISourceProvider, ProviderType } from '../../../types';

import { chain } from 'stream-chain';

import { createEntitiesStream, createEntitiesTransformStream } from './entities';
import { createLinksStream } from './links';

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

    return chain([
      // Entities stream
      await createEntitiesStream(this.strapi),
      // Transform stream
      createEntitiesTransformStream(),
    ]);
  }

  streamLinks(): NodeJS.ReadableStream {
    if (!this.strapi) {
      throw new Error('Not able to stream links. Strapi instance not found');
    }

    return createLinksStream(this.strapi);
  }
}
