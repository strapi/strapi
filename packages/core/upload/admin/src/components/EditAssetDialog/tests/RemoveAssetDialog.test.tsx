import { configureStore } from '@reduxjs/toolkit';
import { NotificationsProvider, adminApi } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import en from '../../../translations/en.json';
import { RemoveAssetDialog } from '../RemoveAssetDialog';

type Messages = typeof en;
type MessageKeys = keyof Messages;

const enKeys = Object.keys(en) as MessageKeys[];

const messageForPlugin = enKeys.reduce(
  (acc: { [key in MessageKeys]: string }, curr: MessageKeys) => {
    acc[curr] = `upload.${en[curr]}`;

    return acc;
  },
  {} as { [key in MessageKeys]: string }
);

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

const store = configureStore({
  reducer: { [adminApi.reducerPath]: adminApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(adminApi.middleware),
});

const ComponentFixture = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              refetchOnWindowFocus: false,
            },
          },
        })
      }
    >
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <NotificationsProvider>{children}</NotificationsProvider>
        </IntlProvider>
      </DesignSystemProvider>
    </QueryClientProvider>
  </Provider>
);

const renderCompo = (handleCloseSpy = jest.fn()) => {
  return render(
    <ComponentFixture>
      <RemoveAssetDialog open onClose={handleCloseSpy} asset={asset} />
    </ComponentFixture>
  );
};

const user = userEvent.setup();

describe('RemoveAssetDialog', () => {
  it('snapshots the component', () => {
    renderCompo();

    expect(document.body).toMatchSnapshot();
  });

  it('closes the dialog when pressing cancel', async () => {
    const handleCloseSpy = jest.fn();
    renderCompo(handleCloseSpy);

    await user.click(screen.getByText('Cancel'));

    expect(handleCloseSpy).toHaveBeenCalled();
  });
});
