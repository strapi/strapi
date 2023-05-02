import { renderHook } from '@testing-library/react-hooks';

import { useAllowedAttributes } from '../useAllowedAttributes';

const FIXTURE_CONTENT_TYPE = {
  attributes: {
    id: {
      type: 'integer',
    },
    text: {
      type: 'text',
    },
    json: {
      type: 'json',
    },
    media: {
      type: 'media',
    },
    password: {
      type: 'password',
    },
    richtext: {
      type: 'richtext',
    },
    noType: {},
    createdAt: {
      type: 'datetime',
    },
  },
};

const FIXTURE_SLUG = 'api::content-type.content-type';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBACProvider: jest.fn().mockReturnValue({
    allPermissions: [
      {
        id: 1,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::content-type.content-type',
        conditions: [],
        properties: {
          fields: ['id', 'text', 'json', 'media', 'password', 'richtext', 'noType'],
        },
      },
    ],
  }),
}));

function setup(...args) {
  return renderHook(() => useAllowedAttributes(...args));
}

describe('useAllowedAttributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return only allowed attribute-types', () => {
    const { result } = setup(FIXTURE_CONTENT_TYPE, FIXTURE_SLUG);

    expect(result.current).toStrictEqual(['id', 'text', 'createdAt']);
  });
});
