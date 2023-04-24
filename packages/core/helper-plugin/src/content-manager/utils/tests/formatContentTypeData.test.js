import formatContentTypeData from '../formatContentTypeData';
import testData from './testData';

const { contentType, components, modifiedData } = testData;

describe('STRAPI_HELPER_PLUGIN | utils | formatContentTypeData', () => {
  it('should add the __temp_key__ property to each repeatable component object', () => {
    const expected = {
      createdAt: '2020-04-28T13:22:13.033Z',
      dz: [
        {
          __component: 'compos.sub-compo',
          id: 7,
          name: 'name',
          password: 'password',
        },
        {
          id: 4,
          name: 'name',
          password: 'password',
          subcomponotrepeatable: null,
          subrepeatable: [],
          __component: 'compos.test-compo',
        },
        {
          id: 5,
          name: 'name',
          password: 'password',
          subcomponotrepeatable: { id: 9, name: 'name', password: 'password' },
          subrepeatable: [{ id: 8, name: 'name', password: 'password', __temp_key__: 0 }],
          __component: 'compos.test-compo',
        },
        {
          id: 6,
          name: null,
          password: null,
          subcomponotrepeatable: null,
          subrepeatable: [],
          __component: 'compos.test-compo',
        },
      ],
      id: 1,
      name: 'name',
      notrepeatable: {
        id: 1,
        name: 'name',
        password: 'password',
        subcomponotrepeatable: { id: 4, name: 'name', password: 'password' },
        subrepeatable: [
          { id: 1, name: 'name', password: 'password', __temp_key__: 0 },
          { id: 2, name: 'name', password: 'password', __temp_key__: 1 },
          { id: 3, name: 'name', password: 'password', __temp_key__: 2 },
        ],
      },
      password: 'password',
      repeatable: [
        {
          id: 2,
          name: 'name',
          password: 'password',
          subrepeatable: [{ id: 5, name: 'name', password: 'password', __temp_key__: 0 }],
          subcomponotrepeatable: { id: 6, name: 'name', password: 'password' },
          __temp_key__: 0,
        },
        {
          id: 3,
          name: 'name',
          password: 'password',
          subrepeatable: [],
          subcomponotrepeatable: null,
          __temp_key__: 1,
        },
      ],
      updatedAt: '2020-04-28T13:22:13.033Z',
    };

    expect(formatContentTypeData(modifiedData, contentType, components)).toEqual(expected);
  });

  it('should stringify json fields', () => {
    const contentType = {
      uid: 'api::test.test',
      apiID: 'test',
      attributes: {
        id: { type: 'integer' },
        name: { type: 'string' },
        dz: { type: 'dynamiczone', components: ['compos.sub-compo'] },
        jsonString: { type: 'json' },
        jsonObject: { type: 'json' },
        jsonBool: { type: 'json' },
      },
    };

    const components = {
      'compos.sub-compo': {
        uid: 'compos.sub-compo',
        category: 'compos',
        attributes: {
          id: { type: 'integer' },
          name: { type: 'string' },
          password: { type: 'password' },
          jsonString: { type: 'json' },
          jsonObject: { type: 'json' },
        },
      },
    };

    const data = {
      id: 1,
      name: 'name',
      dz: [
        {
          __component: 'compos.sub-compo',
          id: 7,
          name: 'name',
          password: 'password',
          jsonString: 'hello',
          jsonObject: { hello: true },
        },
      ],
      jsonString: 'hello',
      jsonObject: { hello: true },
      jsonBool: false,
    };

    const expected = {
      id: 1,
      name: 'name',
      dz: [
        {
          __component: 'compos.sub-compo',
          id: 7,
          name: 'name',
          password: 'password',
          jsonString: '"hello"',
          jsonObject: '{\n  "hello": true\n}',
        },
      ],
      jsonString: '"hello"',
      jsonObject: '{\n  "hello": true\n}',
      jsonBool: 'false',
    };

    expect(formatContentTypeData(data, contentType, components)).toEqual(expected);
  });
});
