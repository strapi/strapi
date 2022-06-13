import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { RemoveAssetDialog } from '../RemoveAssetDialog';
import en from '../../../translations/en.json';
import server from './server';

jest.mock('../../../utils/deleteRequest', () => ({
  ...jest.requireActual('../../../utils/deleteRequest'),
  deleteRequest: jest.fn().mockResolvedValue({ id: 1 }),
}));

const messageForPlugin = Object.keys(en).reduce((acc, curr) => {
  acc[curr] = `upload.${en[curr]}`;

  return acc;
}, {});

const asset = {
  id: 8,
  name: 'Screenshot 2.png',
  alternativeText: null,
  caption: null,
  width: 1476,
  height: 780,
  formats: {
    thumbnail: {
      name: 'thumbnail_Screenshot 2.png',
      hash: 'thumbnail_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 245,
      height: 129,
      size: 10.7,
      path: null,
      url: '/uploads/thumbnail_Screenshot_2_5d4a574d61.png',
    },
    large: {
      name: 'large_Screenshot 2.png',
      hash: 'large_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 1000,
      height: 528,
      size: 97.1,
      path: null,
      url: '/uploads/large_Screenshot_2_5d4a574d61.png',
    },
    medium: {
      name: 'medium_Screenshot 2.png',
      hash: 'medium_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 750,
      height: 396,
      size: 58.7,
      path: null,
      url: '/uploads/medium_Screenshot_2_5d4a574d61.png',
    },
    small: {
      name: 'small_Screenshot 2.png',
      hash: 'small_Screenshot_2_5d4a574d61',
      ext: '.png',
      mime: 'image/png',
      width: 500,
      height: 264,
      size: 31.06,
      path: null,
      url: '/uploads/small_Screenshot_2_5d4a574d61.png',
    },
  },
  hash: 'Screenshot_2_5d4a574d61',
  ext: '.png',
  mime: 'image/png',
  size: 102.01,
  url: '/uploads/Screenshot_2_5d4a574d61.png',
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  createdAt: '2021-10-04T09:42:31.670Z',
  updatedAt: '2021-10-04T09:42:31.670Z',
};

const renderCompo = (handleCloseSpy = jest.fn(), toggleNotificationSpy = jest.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <NotificationsProvider toggleNotification={toggleNotificationSpy}>
          <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
            <RemoveAssetDialog onClose={handleCloseSpy} asset={asset} />
          </IntlProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>,
    { container: document.getElementById('app') }
  );
};

describe('RemoveAssetDialog', () => {
  beforeAll(() => server.listen());

  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('snapshots the component', () => {
    renderCompo();

    expect(document.body).toMatchSnapshot();
  });

  it('closes the dialog when pressing cancel', () => {
    const handleCloseSpy = jest.fn();
    renderCompo(handleCloseSpy);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCloseSpy).toHaveBeenCalled();
  });

  describe('remove asset', () => {
    it('closes the dialog when everything is going okay when removing', async () => {
      const handleCloseSpy = jest.fn();
      const toggleNotificationSpy = jest.fn();
      renderCompo(handleCloseSpy, toggleNotificationSpy);

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => expect(handleCloseSpy).toHaveBeenCalled());
      await waitFor(() =>
        expect(toggleNotificationSpy).toHaveBeenCalledWith({
          message: {
            defaultMessage: 'The asset has been successfully removed.',
            id: 'modal.remove.success-label',
          },
          type: 'success',
        })
      );
    });
  });
});
