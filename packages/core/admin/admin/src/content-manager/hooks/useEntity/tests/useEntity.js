import * as React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { IntlProvider } from 'react-intl';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { renderHook } from '@testing-library/react-hooks';

import { useEntity } from '..';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockReturnValue(jest.fn()),
  useTracking: jest.fn().mockReturnValue({ trackUsage: jest.fn() }),
}));

// eslint-disable-next-line react/prop-types
function ComponentFixture({ children }) {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        {children}
      </IntlProvider>
    </QueryClientProvider>
  );
}

function setup(...args) {
  return renderHook(() => useEntity(...args), { wrapper: ComponentFixture });
}

const server = setupServer(
  rest.get('*/content-manager/test::test', (req, res, ctx) => {
    return res(ctx.json({}));
  }),

  rest.put(`*/content-manager/test::test/1`, (req, res, ctx) => {
    return res(ctx.json({}));
  })
);

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Content-Manager | useEntity', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('initialize', () => {
    setup();
  });
  test('create', () => {});
  test('update', () => {});
  test('delete', () => {});
  test('publish', () => {});
  test('unpublish', () => {});
});
