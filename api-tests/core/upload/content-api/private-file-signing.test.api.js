'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
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

const populate = {
  media: true,
  media_repeatable: true,
  compo_media: {
    populate: {
      media: true,
      media_repeatable: true,
    },
  },
  compo_media_repeatable: {
    populate: {
      media: true,
      media_repeatable: true,
    },
  },
  dynamicZone: {
    populate: {
      media: true,
      media_repeatable: true,
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
  return rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, `../utils/${fileName}`)),
    },
  });
};

let repeatable;
let singleMedia;
let mediaEntry = {};

describe('Upload Plugin url signing', () => {
  const responseExpectations = (result) => {
    expect(result.media.url).toEqual('signedUrl');

    for (const media of result.media_repeatable) {
      expect(media.url).toEqual('signedUrl');
    }

    expect(result.compo_media.media.url).toEqual('signedUrl');
    for (const media of result.compo_media.media_repeatable) {
      expect(media.url).toEqual('signedUrl');
    }

    for (const component of result.compo_media_repeatable) {
      expect(component.media.url).toEqual('signedUrl');
      for (const media of component.media_repeatable) {
        expect(media.url).toEqual('signedUrl');
      }
    }

    for (const component of result.dynamicZone) {
      expect(component.media.url).toEqual('signedUrl');
      for (const media of component.media_repeatable) {
        expect(media.url).toEqual('signedUrl');
      }
    }
  };

  let entity;

  beforeAll(async () => {
    const localProviderPath = require.resolve('@strapi/provider-upload-local');
    jest.mock(localProviderPath, () => mockProvider(true));

    //  Create builder
    await builder.addComponent(models[componentUID]).addContentType(models[modelUID]).build();

    // Create api instance
    strapi = await createStrapiInstance();

    rq = await createContentAPIRequest({ strapi });

    const imgRes = [await uploadImg('rec.jpg'), await uploadImg('strapi.jpg')];

    repeatable = imgRes.map((img) => img.body[0].id);
    singleMedia = imgRes[0].body[0].id;
    mediaEntry = {
      media: singleMedia,
      media_repeatable: repeatable,
    };
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns signed media URLs on content creation', async () => {
    entity = await strapi.entityService.create(modelUID, {
      data: {
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
      populate,
    });

    responseExpectations(entity);
  });

  test('returns signed media URLs when we GET content', async () => {
    const en = await strapi.entityService.findOne(modelUID, entity.id, {
      populate,
    });

    responseExpectations(en);
  });
});
