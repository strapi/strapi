// Child script for upload/unhandled-rejection.test.ts: the thumbnail upload rejects while responsive
// format generation still spans an event loop turn.
import _ from 'lodash';
import createUploadService from '../../upload';

const defaultConfig = {
  'plugin::upload': {
    provider: 'local',
  },
};

const nextTurn = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const providerMethods = {
  async upload(file: { hash: string }) {
    if (file.hash === 'thumbnail_image_d9b4f84424') {
      throw new Error('provider rejected');
    }
  },
};

const imageManipulationMock = {
  getDimensions: async () => ({ width: 1500, height: 1000 }),
  isResizableImage: async () => true,
  generateThumbnail: async () => ({ hash: 'thumbnail_image_d9b4f84424', ext: '.png' }),
  async generateResponsiveFormats() {
    await nextTurn();
    return [];
  },
};

const services: Record<string, any> = {
  provider: providerMethods,
  'image-manipulation': imageManipulationMock,
};

global.strapi = {
  config: {
    get: (configPath: any, defaultValue: any) => _.get(defaultConfig, configPath, defaultValue),
  },
  plugins: {
    upload: {
      services,
      provider: providerMethods,
      service: (name: string) => services[name],
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

const uploadService = createUploadService({ strapi: global.strapi } as any);

uploadService
  ._uploadImage({ hash: 'image_d9b4f84424', ext: '.png' } as any)
  .then(() => {
    console.log('upload resolved');
  })
  .catch((error: Error) => {
    console.log(error.message);
  });
