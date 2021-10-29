import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { QueryClient, QueryClientProvider } from 'react-query';
import { NotificationsProvider, useRBAC, useQueryParams } from '@strapi/helper-plugin';

import { MediaLibraryInput } from '..';
import en from '../../../translations/en.json';

jest.mock('../../../utils/downloadFile');

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(),
  useNotification: jest.fn(() => jest.fn()),
  useQueryParams: jest.fn(),
}));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || id) }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderCompo = (props = { intlLabel: { id: 'default', defaultMessage: 'default message' } }) =>
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <NotificationsProvider toggleNotification={jest.fn()}>
          <MediaLibraryInput {...props} />
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>,
    { container: document.body }
  );

describe('<MediaLibraryInput />', () => {
  beforeEach(() => {
    useRBAC.mockReturnValue({
      isLoading: false,
      allowedActions: {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canCopyLink: true,
        canDownload: true,
      },
    });

    useQueryParams.mockReturnValue([{ rawQuery: 'some-url' }, jest.fn()]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders and matches the snapshot', () => {
    const { container } = renderCompo();

    expect(container).toMatchSnapshot();
  });
});
