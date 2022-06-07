import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render } from '@testing-library/react';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';

import { BulkMoveDialog } from '..';

jest.mock('../../../hooks/useFolderStructure');

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function ComponentFixture(props) {
  return (
    <QueryClientProvider client={client}>
      <IntlProvider locale="en" messages={{}}>
        <ThemeProvider theme={lightTheme}>
          <NotificationsProvider toggleNotification={() => {}}>
            <BulkMoveDialog {...props} />
          </NotificationsProvider>
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

function setup(props = { onClose: jest.fn() }) {
  return render(<ComponentFixture {...props} />, { container: document.body });
}

describe('BulkMoveDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders and matches the snapshot', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });
});
