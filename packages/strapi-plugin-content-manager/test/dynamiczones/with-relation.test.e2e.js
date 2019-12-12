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

    await modelsUtils.createContentType({
      name: 'related-to',
      attributes: {},
    });

    await modelsUtils.createComponent({
      name: 'with-one-way',
      attributes: {
        relation: {
          nature: 'oneWay',
          target: 'application::related-to.related-to',
        },
      },
    });

    await modelsUtils.createComponent({
      name: 'with-many-way',
      attributes: {
        relation: {
          nature: 'manyWay',
          target: 'application::related-to.related-to',
        },
      },
    });

    await modelsUtils.createComponent({
      name: 'with-nested',
      attributes: {
        oneWay: {
          type: 'component',
          component: 'default.with-one-way',
        },
        manyWay: {
          type: 'component',
          component: 'default.with-many-way',
        },
      },
    });

    await modelsUtils.createContentTypeWithType(
      'withdynamiczone',
      'dynamiczone',
      {
        components: [
          'default.with-one-way',
          'default.with-many-way',
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
    await modelsUtils.deleteComponent('default.with-one-way');
    await modelsUtils.deleteComponent('default.with-many-way');
    await modelsUtils.deleteContentType('related-to');
    await modelsUtils.deleteContentType('withdynamiczone');
  }, 60000);

  describe('Contains components with relations', () => {
    test.todo('The relations are correctly set on the components on creation');
    test.todo('The relations are correctly set on the components on edition');
    test.todo('The relatons are populated on the components');
  });

  describe('Contains components with nested components having relations', () => {
    test.todo(
      'The relations are correctly set on the nested components on creation'
    );
    test.todo(
      'The relations are correctly set on the nested components on edition'
    );
    test.todo('The relatons are populated on nested components');
  });
});
