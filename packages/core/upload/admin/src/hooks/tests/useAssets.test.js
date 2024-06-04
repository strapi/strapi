import { useFetchClient } from '@strapi/admin/strapi-admin';
import { renderHook, waitFor, screen } from '@tests/utils';

import { useAssets } from '../useAssets';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        id: 1,
      },
    }),
  }),
}));

function setup(...args) {
  return renderHook(() => useAssets(...args));
}

describe('useAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query was set', async () => {
    setup();

    const { get } = useFetchClient();

    const expected = {
      filters: {
        $and: [
          {
            folderPath: {
              $eq: '/',
            },
          },
        ],
      },
    };

    await waitFor(() => expect(get).toBeCalledWith(`/upload/files`, { params: expected }));
  });

  test('fetches data from the right URL if a query was set', async () => {
    const { result } = setup({ query: { folderPath: '/1/2' } });

    await waitFor(() => result.current.isSuccess);
    const { get } = useFetchClient();

    const expected = {
      filters: {
        $and: [
          {
            folderPath: {
              $eq: '/1/2',
            },
          },
        ],
      },
    };

    await waitFor(() => expect(get).toBeCalledWith(`/upload/files`, { params: expected }));
  });

  test('allows to merge filter query params using filters.$and', async () => {
    const { result } = setup({
      query: { folderPath: '/1/2', filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    const { get } = useFetchClient();

    const expected = {
      filters: {
        $and: [
          {
            something: 'true',
          },
          {
            folderPath: {
              $eq: '/1/2',
            },
          },
        ],
      },
    };

    await waitFor(() => expect(get).toBeCalledWith(`/upload/files`, { params: expected }));
  });

  test('does not use folderPath filter in params if _q', async () => {
    const { result } = setup({
      query: { folderPath: '/1/2', _q: 'something', filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    const { get } = useFetchClient();

    const expected = {
      filters: {
        $and: [
          {
            something: 'true',
          },
        ],
      },
      _q: 'something',
    };

    await waitFor(() => expect(get).toBeCalledWith(`/upload/files`, { params: expected }));
  });

  test('correctly encodes the search query _q', async () => {
    const _q = 'something&else';
    const { result } = setup({
      query: { folderPath: '/1/2', _q, filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    const { get } = useFetchClient();

    const expected = {
      filters: {
        $and: [
          {
            something: 'true',
          },
        ],
      },
      _q: encodeURIComponent(_q),
    };

    await waitFor(() => expect(get).toBeCalledWith(`/upload/files`, { params: expected }));
  });

  test('it does not fetch, if skipWhen is set', async () => {
    const { result } = setup({ skipWhen: true });

    await waitFor(() => result.current.isSuccess);

    const { get } = useFetchClient();

    expect(get).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();
    const { get } = useFetchClient();

    get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { result } = setup({});

    await waitFor(() => result.current.isSuccess);
    await screen.findByText('notification.error');

    console.error = originalConsoleError;
  });

  it('should filter out any assets without a name', async () => {
    const { get } = useFetchClient();

    get.mockReturnValue({
      data: {
        results: [
          {
            name: null,
            mime: 'image/jpeg',
            ext: 'jpg',
          },
          {
            name: 'test',
            mime: 'image/jpeg',
            ext: 'jpg',
          },
        ],
      },
    });

    const { result } = setup({});

    await waitFor(() =>
      expect(result.current.data.results).toEqual([
        {
          name: 'test',
          mime: 'image/jpeg',
          ext: 'jpg',
        },
      ])
    );
  });

  it('should set mime and ext to strings as defaults if they are nullish', async () => {
    const { get } = useFetchClient();

    get.mockReturnValue({
      data: {
        results: [
          {
            name: 'test 1',
            mime: null,
            ext: 'jpg',
          },
          {
            name: 'test 2',
            mime: 'image/jpeg',
            ext: null,
          },
          {
            name: 'test 3',
            mime: null,
            ext: null,
          },
          {
            name: 'test 4',
            mime: 'image/jpeg',
            ext: 'jpg',
          },
        ],
      },
    });

    const { result } = setup({});

    await waitFor(() =>
      expect(result.current.data.results).toMatchInlineSnapshot(`
    [
      {
        "ext": "jpg",
        "mime": "",
        "name": "test 1",
      },
      {
        "ext": "",
        "mime": "image/jpeg",
        "name": "test 2",
      },
      {
        "ext": "",
        "mime": "",
        "name": "test 3",
      },
      {
        "ext": "jpg",
        "mime": "image/jpeg",
        "name": "test 4",
      },
    ]
  `)
    );
  });
});
