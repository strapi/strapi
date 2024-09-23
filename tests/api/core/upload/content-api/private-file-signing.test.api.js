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

let isPrivate = true;

const mockProvider = () => ({
  init() {
    return {
      isPrivate() {
        return isPrivate;
      },
      getSignedUrl() {
        return { url: 'signedUrl' };
      },
      uploadStream(file) {
        file.url = 'strapi.jpg';
      },
      upload(file) {
        file.url = 'strapi.jpg';
      },
      delete() {},
      checkFileSize() {},
    };
  },
});

const createModel = async (name = 'name') => {
  return strapi.entityService.create(modelUID, {
    data: {
      name,
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
};

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
let model;

describe.skip('Upload Plugin url signing', () => {
  const expectMedia = (media, expectedUrl) => {
    expect(media.url).toEqual(expectedUrl);
  };

  const expectRepeatable = (repeatable, expectedUrl) => {
    for (const media of repeatable) {
      expectMedia(media, expectedUrl);
    }
  };

  const responseExpectations = (result, expectedUrl) => {
    expectMedia(result.media, expectedUrl);
    expectRepeatable(result.media_repeatable, expectedUrl);

    expect(result.compo_media.media.url).toEqual(expectedUrl);
    for (const media of result.compo_media.media_repeatable) {
      expect(media.url).toEqual(expectedUrl);
    }

    for (const component of result.compo_media_repeatable) {
      expect(component.media.url).toEqual(expectedUrl);
      for (const media of component.media_repeatable) {
        expect(media.url).toEqual(expectedUrl);
      }
    }

    for (const component of result.dynamicZone) {
      expect(component.media.url).toEqual(expectedUrl);
      for (const media of component.media_repeatable) {
        expect(media.url).toEqual(expectedUrl);
      }
    }
  };

  beforeAll(async () => {
    const localProviderPath = require.resolve('@strapi/provider-upload-local');
    jest.mock(localProviderPath, () => mockProvider(true));

    //  Create builder
    await builder.addComponent(models[componentUID]).addContentType(models[modelUID]).build();

    // Create api instance
    strapi = await createStrapiInstance();

    rq = await createContentAPIRequest({ strapi });

    const imgRes = [await uploadImg('strapi.jpg'), await uploadImg('strapi.jpg')];

    repeatable = imgRes.map((img) => img.body[0].id);
    singleMedia = imgRes[0].body[0].id;
    mediaEntry = {
      media: singleMedia,
      media_repeatable: repeatable,
    };

    model = await createModel('model1');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Returns signed media URLs on', () => {
    test('entityService.create', async () => {
      let entity = await createModel();
      responseExpectations(entity, 'signedUrl');
    });

    test('entityService.findOne', async () => {
      const entity = await strapi.entityService.findOne(modelUID, model.id, {
        populate,
      });

      responseExpectations(entity, 'signedUrl');
    });

    test('entityService.findMany', async () => {
      const entities = await strapi.entityService.findMany(modelUID, {
        populate,
      });

      for (const entity of entities) {
        responseExpectations(entity, 'signedUrl');
      }
    });

    test('entityService.findPage', async () => {
      const entities = await strapi.entityService.findPage(modelUID, {
        populate,
      });
      for (const entity of entities.results) {
        responseExpectations(entity, 'signedUrl');
      }
    });

    test('entityService.update', async () => {
      const model = await createModel();
      const entity = await strapi.entityService.update(modelUID, model.id, {
        data: {
          name: 'model_updated',
        },
        populate,
      });

      responseExpectations(entity, 'signedUrl');
    });

    test('entityService.delete', async () => {
      const model = await createModel();
      const entity = await strapi.entityService.delete(modelUID, model.id, {
        populate,
      });

      responseExpectations(entity, 'signedUrl');
    });

    test('entityService.load', async () => {
      const model = await createModel();
      const media_repeatable = await strapi.entityService.load(
        modelUID,
        { id: model.id },
        'media_repeatable'
      );

      expectRepeatable(media_repeatable, 'signedUrl');
    });
  });

  describe('Does not return signed media URLs on', () => {
    beforeAll(async () => {
      isPrivate = false;
    });

    test('entityService.create', async () => {
      let entity = await createModel();
      responseExpectations(entity, 'strapi.jpg');
    });

    test('entityService.findOne', async () => {
      const entity = await strapi.entityService.findOne(modelUID, model.id, {
        populate,
      });

      responseExpectations(entity, 'strapi.jpg');
    });

    test('entityService.findMany', async () => {
      const entities = await strapi.entityService.findMany(modelUID, {
        populate,
      });

      for (const entity of entities) {
        responseExpectations(entity, 'strapi.jpg');
      }
    });

    test('entityService.findPage', async () => {
      const entities = await strapi.entityService.findPage(modelUID, {
        populate,
      });
      for (const entity of entities.results) {
        responseExpectations(entity, 'strapi.jpg');
      }
    });

    test('entityService.update', async () => {
      const model = await createModel();
      const entity = await strapi.entityService.update(modelUID, model.id, {
        data: {
          name: 'model_updated',
        },
        populate,
      });

      responseExpectations(entity, 'strapi.jpg');
    });

    test('entityService.delete', async () => {
      const model = await createModel();
      const entity = await strapi.entityService.delete(modelUID, model.id, {
        populate,
      });

      responseExpectations(entity, 'strapi.jpg');
    });

    test('entityService.load', async () => {
      const model = await createModel();
      const media_repeatable = await strapi.entityService.load(
        modelUID,
        { id: model.id },
        'media_repeatable'
      );

      expectRepeatable(media_repeatable, 'strapi.jpg');
    });
  });
});
