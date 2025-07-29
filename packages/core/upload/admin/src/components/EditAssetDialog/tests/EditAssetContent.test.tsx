// TODO: find a better naming convention for the file that was an index file before
/**
 *
 * Tests for EditAssetDialog
 *
 */
import { NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import en from '../../../translations/en.json';
import { downloadFile } from '../../../utils';
import { EditAssetDialog, Asset } from '../EditAssetContent';

type Messages = typeof en;

jest.mock('../../../utils/downloadFile');
jest.mock('../../../hooks/useFolderStructure');
/**
 * Mock the cropper import to avoid having an error
 */
jest.mock('cropperjs/dist/cropper.css?raw', () => '', {
  virtual: true,
});
const messageForPlugin = Object.keys(en).reduce<Record<string, string>>((acc, curr) => {
  acc[curr] = `upload.${en[curr as keyof Messages]}`;

  return acc;
}, {});

const asset: Asset = {
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
      sizeInBytes: 10700,
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
      sizeInBytes: 97100,
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
      sizeInBytes: 58700,
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
      sizeInBytes: 31060,
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderCompo = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <NotificationsProvider>
            <EditAssetDialog
              open
              asset={asset}
              onClose={jest.fn()}
              canUpdate
              canCopyLink
              canDownload
            />
          </NotificationsProvider>
        </IntlProvider>
      </DesignSystemProvider>
    </QueryClientProvider>
  );

describe('<EditAssetDialog />', () => {
  const RealNow = Date.now;

  beforeAll(() => {
    global.Date.now = jest.fn(() => new Date('2021-09-20').getTime());
  });

  afterAll(() => {
    global.Date.now = RealNow;
  });

  it('renders and matches the snapshot', () => {
    renderCompo();

    expect(document.body).toMatchSnapshot();
  });

  describe('PreviewBox', () => {
    it('opens the delete dialog when pressing the delete button', () => {
      renderCompo();

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.getByText('Confirmation')).toBeVisible();
      expect(screen.getByText('Are you sure?')).toBeVisible();
    });

    it('copies the link and shows a notification when pressing "Copy link"', async () => {
      renderCompo();

      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

      await screen.findByText('Link copied into the clipboard');
    });

    it('downloads the file when pressing "Download"', () => {
      renderCompo();

      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(downloadFile).toHaveBeenCalledWith(
        'http://localhost:1337/uploads/Screenshot_2_5d4a574d61.png',
        'Screenshot 2.png'
      );
    });
  });
});
