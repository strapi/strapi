import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClient, QueryClientProvider } from 'react-query';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { MediaLibraryInput } from '..';
import en from '../../../translations/en.json';

jest.mock('../../../utils/downloadFile');

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: (x) => x,
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

const renderCompo = (
  props = {
    onChange: jest.fn(),
    name: 'test',
    intlLabel: {
      id: 'default',
      defaultMessage: 'default message',
    },
  }
) =>
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <NotificationsProvider toggleNotification={jest.fn()}>
          <MediaLibraryInput {...props} />
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>,
    { container: document.getElementById('app') }
  );

describe('<MediaLibraryInput />', () => {
  it('renders and matches the snapshot', () => {
    renderCompo();

    expect(document.body).toMatchSnapshot();
  });
});
