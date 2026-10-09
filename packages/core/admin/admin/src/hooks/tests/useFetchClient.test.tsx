// eslint-disable-next-line check-file/filename-naming-convention
import * as React from 'react';

import { renderHook as renderHookWithoutProviders } from '@testing-library/react';
import { render, renderHook, server, waitFor } from '@tests/utils';
import { delay, http, HttpResponse } from 'msw';

import { useFetchClient } from '../useFetchClient';

const Component = () => {
  const { get } = useFetchClient();
  const [data, setData] = React.useState<unknown>(null);
  const [dataCalls, setDataCalls] = React.useState(0);

  React.useEffect(() => {
    setDataCalls((s) => s + 1);
    get('/use-fetch-client-test').then(({ data }) => setData(data));
  }, [get]);

  if (data === null) {
    return null;
  }

  return <h1>called data times {dataCalls}</h1>;
};

describe('useFetchClient', () => {
  it('should be able to fetch data from a server', async () => {
    const { result } = renderHook(() => useFetchClient());

    const { data } = await result.current.get('/use-fetch-client-test');

    expect(data).toEqual({
      data: {
        pagination: {
          page: 1,
          pageCount: 10,
        },
        results: [
          {
            id: 2,
            name: 'newest',
            publishedAt: null,
          },
          {
            id: 1,
            name: 'oldest',
            publishedAt: null,
          },
        ],
      },
    });
  });

  it('should call the GET method once even when we rerender the Component', async () => {
    const { rerender, getByRole, queryByRole } = render(<Component />);

    await waitFor(() => expect(queryByRole('heading')).toHaveTextContent('called data times 1'));

    rerender(<Component />);

    expect(getByRole('heading')).toHaveTextContent('called data times 1');
  });

  it('should still complete requests after a React.StrictMode remount', async () => {
    /**
     * StrictMode mounts, runs the effect cleanup (which aborts the controller),
     * then mounts again. Requests made afterwards must not use the aborted signal.
     */
    const { result } = renderHookWithoutProviders(() => useFetchClient(), {
      wrapper: React.StrictMode,
    });

    const { data } = await result.current.get('/use-fetch-client-test');

    expect(data).toHaveProperty('data.results');
  });

  it('should abort pending requests when the component unmounts', async () => {
    server.use(
      http.get('/use-fetch-client-slow', async () => {
        await delay('infinite');

        return HttpResponse.json({});
      })
    );

    const { result, unmount } = renderHookWithoutProviders(() => useFetchClient(), {
      wrapper: React.StrictMode,
    });

    const request = result.current.get('/use-fetch-client-slow');

    unmount();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
