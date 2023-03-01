'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;

let baseRequest;
let rq;

const modelUID = 'api::model.model';
const componentUID = 'default.component';

const models = {
  [modelUID]: {
    displayName: 'Model',
    singularName: 'model',
    pluralName: 'models',
    kind: 'collectionType',
    attributes: {
      name: {
        type: 'text',
      },
      media: {
        type: 'media',
      },
      media_repeatable: {
        type: 'media',
        multiple: true,
      },
      compo_media: {
        type: 'component',
        component: componentUID,
      },
      compo_media_repeatable: {
        type: 'component',
        repeatable: true,
        component: componentUID,
      },
      dynamicZone: {
        type: 'dynamiczone',
        components: [componentUID],
      },
    },
  },
  [componentUID]: {
    displayName: 'component',
    attributes: {
      media_repeatable: {
        type: 'media',
        multiple: true,
      },
      media: {
        type: 'media',
        multiple: false,
      },
    },
  },
};

const mockProvider = (signUrl = true) => ({
  init() {
    return {
      isPrivate() {
        return signUrl;
      },
      getSignedUrl() {
        return { url: 'signedUrl' };
      },
      uploadStream() {},
      upload() {},
      delete() {},
      checkFileSize() {},
    };
  },
});

const uploadImg = (fileName) => {
  return baseRequest({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, `../utils/${fileName}`)),
    },
  });
};

describe('Upload Plugin url signing', () => {
  beforeAll(async () => {
    const localProviderPath = require.resolve('@strapi/provider-upload-local');
    jest.mock(localProviderPath, () => mockProvider(true));

    //  Create builder
    await builder.addComponent(models[componentUID]).addContentType(models[modelUID]).build();

    // Create api instance
    strapi = await createStrapiInstance();

    baseRequest = await createAuthRequest({ strapi });

    rq = await createAuthRequest({ strapi });
    rq.setURLPrefix(`/content-manager/collection-types/${modelUID}`);

    const imgRes = [await uploadImg('rec.jpg'), await uploadImg('strapi.jpg')];

    const repeatable = imgRes.map((img) => img.body[0].id);
    const singleMedia = imgRes[0].body[0].id;
    const mediaEntry = {
      media: singleMedia,
      media_repeatable: repeatable,
    };

    const creationResult = await rq.post('/', {
      body: {
        name: 'name',
        media: singleMedia,
        media_repeatable: repeatable,
        compo_media: mediaEntry,
        compo_media_repeatable: [mediaEntry, mediaEntry],
        dynamicZone: [
          {
            __component: componentUID,
            ...mediaEntry,
          },
        ],
      },
      qs: {
        populate: ['name'],
      },
    });

    expect(creationResult.statusCode).toBe(200);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns a signed url for private upload providers', async () => {
    const res = await baseRequest({
      method: 'GET',
      url: `/content-manager/collection-types/${modelUID}/1`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.media.url).toEqual('signedUrl');

    for (const media of res.body.media_repeatable) {
      expect(media.url).toEqual('signedUrl');
    }

    expect(res.body.compo_media.media.url).toEqual('signedUrl');
    for (const media of res.body.compo_media.media_repeatable) {
      expect(media.url).toEqual('signedUrl');
    }

    for (const component of res.body.compo_media_repeatable) {
      expect(component.media.url).toEqual('signedUrl');
      for (const media of component.media_repeatable) {
        expect(media.url).toEqual('signedUrl');
      }
    }

    for (const component of res.body.dynamicZone) {
      expect(component.media.url).toEqual('signedUrl');
      for (const media of component.media_repeatable) {
        expect(media.url).toEqual('signedUrl');
      }
    }
  });
});
