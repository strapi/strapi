import formatContentTypeData from '../formatContentTypeData';
import testData from './testData';

const { contentType, components, modifiedData } = testData;

describe('STRAPI_HELPER_PLUGIN | utils | formatContentTypeData', () => {
  it('should add the __temp_key__ property to each repeatable component object && stringify json fields', () => {
    const expected = {
      createdAt: '2020-04-28T13:22:13.033Z',
      dz: [
        {
          __component: 'compos.sub-compo',
          id: 7,
          name: 'name',
          password: 'password',
          jsonString: '"hello"',
          jsonObject: '{\n  "hello": true\n}',
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
      jsonString: '"hello"',
      jsonObject: '{\n  "hello": true\n}',
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
});
