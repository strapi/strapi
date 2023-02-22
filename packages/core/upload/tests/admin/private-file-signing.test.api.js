'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const {
  createAuthRequest,
  createContentAPIRequest,
} = require('../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let request;
let contentAPIRequest;

const model = {
  uid: 'api::profile.profile',
  displayName: 'Profile',
  singularName: 'profile',
  pluralName: 'profiles',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'text',
    },
    profilePicture: {
      type: 'media',
    },
    slideShow: {
      type: 'media',
      multiple: true,
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

describe('Upload Plugin url signing', () => {
  beforeAll(async () => {
    const localProviderPath = require.resolve('@strapi/provider-upload-local');
    jest.mock(localProviderPath, () => mockProvider(true));

    //  Create builder
    await builder.addContentType(model).build();

    // Create api instance
    strapi = await createStrapiInstance();

    request = await createAuthRequest({ strapi });
    contentAPIRequest = createContentAPIRequest({ strapi });

    await contentAPIRequest({
      method: 'POST',
      url: '/profiles?populate=*',
      formData: {
        data: '{}',
        'files.profilePicture': fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns a signed url for private upload providers', async () => {
    const res = await request({
      method: 'GET',
      url: '/content-manager/collection-types/api::profile.profile/1',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.profilePicture.url).toEqual('signedUrl');
  });
});
