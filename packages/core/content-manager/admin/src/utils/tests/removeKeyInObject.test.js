import moment from 'moment';
import removeKeyInObject from '../removeKeyInObject';

const testGeoJson = {
  type: 'GeometryCollection',
  geometries: [
    {
      type: 'Polygon',
      coordinates: [
        [
          [10.5213132, 43.93323823637245],
          [10.473529288411845, 43.926382621922876],
          [10.433048976879297, 43.9068638108183],
          [10.406046931858038, 43.87766379644947],
          [10.396621893557642, 43.8432384146332],
          [10.40617984638903, 43.80883288661175],
          [10.433236946877438, 43.779680803655985],
          [10.473662203601545, 43.760209924123394],
          [10.5213132, 43.753374163627555],
          [10.568964196398454, 43.760209924123394],
          [10.609389453122565, 43.779680803655985],
          [10.636446553610973, 43.80883288661175],
          [10.64600450644236, 43.8432384146332],
          [10.636579468141962, 43.87766379644947],
          [10.609577423120705, 43.9068638108183],
          [10.569097111588155, 43.926382621922876],
          [10.5213132, 43.93323823637245],
        ],
      ],
    },
  ],
  screen: [
    'LayoutBuilder',
    {
      sections: [
        [
          'SectionBuilder',
          {
            container: {},
            query: {},
          },
        ],
      ],
    },
  ],
};

describe('CONTENT MANAGER | utils | removeKeyInObject', () => {
  it('should remove the specified key in a given object', () => {
    const data = {
      id: 1,
      published_at: null,
      created_by: null,
      __temp_key__: 0,
      updated_by: {
        id: 1,
        firstname: 'cyril',
        lastname: 'lopez',
        username: null,
        email: 'cyril@strapi.io',
        resetPasswordToken: null,
        registrationToken: null,
        isActive: true,
        blocked: null,
        __temp_key__: 0,
      },
      created_at: '2020-10-30T08:55:49.824Z',
      updated_at: '2020-10-30T11:07:33.910Z',
      featured_portfolio: {
        id: 1,
        title: 'Portfolio',
        neighborhoods: [
          {
            __component: 'portfolio.neighborhood-block',
            id: 1,
            subtitle: 'Centro',
            eee: [
              {
                id: 7,
                description: 'Test',
                __temp_key__: 0,
              },
            ],
            developments: [
              {
                id: 1,
                published_at: '2020-10-30T08:55:49.686Z',
                created_by: null,
                updated_by: null,
                created_at: '2020-10-30T08:55:49.694Z',
                updated_at: '2020-10-30T08:55:49.694Z',
              },
            ],
          },
          {
            __component: 'portfolio.neighborhood-block',
            id: 2,
            subtitle: 'terztzretrezterrzat ilgehrtzjdfkuyfj',
            eee: [
              {
                id: 6,
                description: 'test',
                __temp_key__: 0,
              },
            ],
            developments: [],
          },
        ],
      },
      test_json: testGeoJson,
    };

    const expected = {
      id: 1,
      published_at: null,
      created_by: null,
      updated_by: {
        id: 1,
        firstname: 'cyril',
        lastname: 'lopez',
        username: null,
        email: 'cyril@strapi.io',
        resetPasswordToken: null,
        registrationToken: null,
        isActive: true,
        blocked: null,
      },
      created_at: '2020-10-30T08:55:49.824Z',
      updated_at: '2020-10-30T11:07:33.910Z',
      featured_portfolio: {
        id: 1,
        title: 'Portfolio',
        neighborhoods: [
          {
            __component: 'portfolio.neighborhood-block',
            id: 1,
            subtitle: 'Centro',
            eee: [
              {
                id: 7,
                description: 'Test',
              },
            ],
            developments: [
              {
                id: 1,
                published_at: '2020-10-30T08:55:49.686Z',
                created_by: null,
                updated_by: null,
                created_at: '2020-10-30T08:55:49.694Z',
                updated_at: '2020-10-30T08:55:49.694Z',
              },
            ],
          },
          {
            __component: 'portfolio.neighborhood-block',
            id: 2,
            subtitle: 'terztzretrezterrzat ilgehrtzjdfkuyfj',
            eee: [
              {
                id: 6,
                description: 'test',
              },
            ],
            developments: [],
          },
        ],
      },
      test_json: testGeoJson,
    };

    expect(removeKeyInObject(data, '__temp_key__')).toEqual(expected);
  });

  it('should not corrupt moment objects', () => {
    const momentObject = moment();

    const data = {
      id: 1,
      comment_date_time: momentObject,
      __temp_key__: 0,
    };

    const expected = {
      id: 1,
      comment_date_time: momentObject,
    };

    const result = removeKeyInObject(data, '__temp_key__');

    expect(result).toEqual(expected);
    expect(result.comment_date_time instanceof moment).toBeTruthy();
  });
});
