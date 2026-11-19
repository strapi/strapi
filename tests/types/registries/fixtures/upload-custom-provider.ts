import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import type { File, UploadPluginProviderOf } from '@strapi/upload/strapi-server';

// An application writes its provider with `factories.createUploadProvider`, which checks it against
// the provider contract and keeps the members of its own.
const cdnProvider = factories.createUploadProvider({
  init(options: { baseUrl: string }) {
    return {
      async uploadStream(file) {
        file.url = `${options.baseUrl}/${file.hash}${file.ext}`;
      },
      async delete() {},
      purge(path: string): boolean {
        return path.startsWith('/');
      },
    };
  },
});

// It declares the provider of that module to call those members.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppPluginProviders {
        upload: UploadPluginProviderOf<typeof cdnProvider>;
      }
    }
  }
}

declare const app: Core.Strapi;
declare const fileRow: File;

const provider = app.plugin('upload').provider;
provider.purge('/images') satisfies Promise<boolean>;
// @ts-expect-error A wrapped member answers with a promise.
provider.purge('/images') satisfies boolean;
// The package contract still applies.
provider.delete(fileRow) satisfies Promise<unknown>;
provider.isPrivate() satisfies boolean | Promise<boolean>;
// @ts-expect-error The application contract has no arbitrary members.
provider.missing();

factories.createUploadProvider({
  // @ts-expect-error A provider implements `delete`.
  init: () => ({ async upload() {} }),
});
