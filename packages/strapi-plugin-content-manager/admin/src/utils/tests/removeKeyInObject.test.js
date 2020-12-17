import removeKeyInObject from '../removeKeyInObject';

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
    };

    expect(removeKeyInObject(data, '__temp_key__')).toEqual(expected);
  });
});
