// eslint-disable-next-line check-file/filename-naming-convention
import * as React from 'react';

import { render, renderHook, waitFor } from '@tests/utils';

import { useFetchClient } from '../useFetchClient';

const Component = () => {
  const { get } = useFetchClient();
  const [data, setData] = React.useState(null);
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

    expect(data).toMatchInlineSnapshot(`
      {
        "data": {
          "pagination": {
            "page": 1,
            "pageCount": 10,
          },
          "results": [
            {
              "id": 2,
              "name": "newest",
              "publishedAt": null,
            },
            {
              "id": 1,
              "name": "oldest",
              "publishedAt": null,
            },
          ],
        },
      }
    `);
  });

  it('should call the GET method once even when we rerender the Component', async () => {
    const { rerender, getByRole, queryByRole } = render(<Component />);

    await waitFor(() => expect(queryByRole('heading')).toHaveTextContent('called data times 1'));

    rerender(<Component />);

    expect(getByRole('heading')).toHaveTextContent('called data times 1');
  });
});
