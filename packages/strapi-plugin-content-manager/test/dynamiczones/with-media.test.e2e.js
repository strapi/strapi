const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe.each([
  [
    'CONTENT MANAGER',
    '/content-manager/explorer/application::withdynamiczone.withdynamiczone',
  ],
  ['GENERATED API', '/withdynamiczones'],
])('[%s] => Not required dynamiczone', (_, path) => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    const authRq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq: authRq });

    await modelsUtils.createComponent({
      name: 'single-image',
      attributes: {
        image: {
          type: 'media',
        },
      },
    });

    await modelsUtils.createComponent({
      name: 'multiple-image',
      attributes: {
        image: {
          type: 'media',
          multiple: true,
        },
      },
    });

    await modelsUtils.createComponent({
      name: 'with-nested',
      attributes: {
        singleImage: {
          type: 'component',
          component: 'default.single-image',
        },
        multipleImage: {
          type: 'component',
          component: 'default.multiple-image',
        },
      },
    });

    await modelsUtils.createContentTypeWithType(
      'withdynamiczone',
      'dynamiczone',
      {
        components: [
          'default.single-image',
          'default.multiple-image',
          'default.with-nested',
        ],
      }
    );

    rq = authRq.defaults({
      baseUrl: `http://localhost:1337${path}`,
    });
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteComponent('default.with-nested');
    await modelsUtils.deleteComponent('default.single-image');
    await modelsUtils.deleteComponent('default.multiple-image');
    await modelsUtils.deleteContentType('withdynamiczone');
  }, 60000);

  describe('Contains components with medias', () => {
    test.todo('The medias are correctly related to the components on creation');
    test.todo('The medias are correctly related to the components on edition');
    test.todo('The media are populated on the components');
  });

  describe('Contains components with nested components having medias', () => {
    test.todo(
      'The medias are correctly related to the nested components on creation'
    );
    test.todo(
      'The medias are correctly related to the nested components on edition'
    );
    test.todo('The media are populated in nested components');
  });
});
