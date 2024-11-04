import { NotificationsProvider } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import en from '../../../translations/en.json';
import { downloadFile } from '../../../utils';
import { EditAssetDialog, Asset } from '../EditAssetContent';

jest.mock('../../../hooks/useFolderStructure');
jest.mock('../../../utils/downloadFile');

type Messages = typeof en;

const messageForPlugin = Object.keys(en).reduce<Record<string, string>>((acc, curr) => {
  acc[curr] = `upload.${en[curr as keyof Messages]}`;

  return acc;
}, {});

const asset: Asset = {
  id: 8,
  name: 'Screenshot 2.png',
  alternativeText: '',
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

const renderCompo = (props = { canUpdate: true, canCopyLink: true, canDownload: true }) =>
  render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <NotificationsProvider>
            <EditAssetDialog open asset={asset} onClose={jest.fn()} {...props} />
          </NotificationsProvider>
        </IntlProvider>
      </DesignSystemProvider>
    </QueryClientProvider>
  );

describe('<EditAssetDialog />', () => {
  const RealNow = Date.now;
  let confirmSpy: jest.SpyInstance;

  beforeAll(() => {
    confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));
    global.Date.now = jest.fn(() => new Date('2021-09-20').getTime());
  });

  afterAll(() => {
    confirmSpy.mockRestore();
    global.Date.now = RealNow;
  });

  it('renders and matches the snapshot', () => {
    renderCompo();

    expect(document.body).toMatchSnapshot();
  });

  describe('metadata form', () => {
    it('checks the default information set in the form', () => {
      renderCompo();

      expect(screen.getByLabelText('File name')).toHaveValue('Screenshot 2.png');
      expect(screen.getByLabelText('Alternative text')).toHaveValue('');
      expect(screen.getByLabelText('Caption')).toHaveValue('');
    });

    it('open confirm box on close if data has changed', () => {
      const { getByRole } = renderCompo();

      fireEvent.change(getByRole('textbox', { name: /alternative text/i }), {
        target: { value: 'Test' },
      });
      fireEvent.click(getByRole('button', { name: /cancel/i }));

      expect(window.confirm).toBeCalled();
    });

    it('disables all the actions and field when the user is not allowed to update', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: false });

      expect(screen.getByLabelText('File name')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByLabelText('Alternative text')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByLabelText('Caption')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Finish' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('shows an error on the FileName input when its not filled', async () => {
      renderCompo();

      fireEvent.change(screen.getByLabelText('File name'), { target: { value: '' } });
      fireEvent.click(screen.getByText('Finish'));

      await screen.findByText('name is a required field');
    });
  });

  describe('PreviewBox', () => {
    it('opens the delete dialog when pressing the delete button when the user is allowed to update', () => {
      renderCompo({ canUpdate: true, canCopyLink: false, canDownload: false });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.getByText('Confirmation')).toBeVisible();
      expect(screen.getByText('Are you sure?')).toBeVisible();
    });

    it('does not open the delete dialog when the user is not allowed to update', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: false });

      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('copies the link and shows a notification when pressing "Copy link" and the user has permission to copy', async () => {
      renderCompo({ canUpdate: false, canCopyLink: true, canDownload: false });

      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

      await screen.findByText('Link copied into the clipboard');
    });

    it('hides the copy link button when the user is not allowed to see it', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: false });

      expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    });

    it('downloads the file when pressing "Download" and the user has the right to download', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: true });

      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(downloadFile).toHaveBeenCalledWith(
        'http://localhost:1337/uploads/Screenshot_2_5d4a574d61.png',
        'Screenshot 2.png'
      );
    });

    it('hides the download button when the user is not allowed to download it', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: false });

      expect(screen.queryByLabelText('Download')).not.toBeInTheDocument();
    });

    it('shows the crop link when the user is allowed to update', () => {
      renderCompo({ canUpdate: true, canCopyLink: false, canDownload: false });

      expect(screen.getByRole('button', { name: 'Crop' })).toBeInTheDocument();
    });

    it('hides the crop link when the user is not allowed to update', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: false });

      expect(screen.queryByRole('button', { name: 'Crop' })).not.toBeInTheDocument();
    });
  });

  describe('replace media', () => {
    it('disables the replacement media button when the user is not allowed to update', () => {
      renderCompo({ canUpdate: false, canCopyLink: false, canDownload: false });

      expect(screen.getByRole('button', { name: 'Replace media' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('replaces the media when pressing the replace media button', async () => {
      const file = new File(['Replacement media'], 'test.png', { type: 'image/png' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileList = [file] as any;
      fileList.item = (i: number) => fileList[i];

      renderCompo({
        canUpdate: true,
        canCopyLink: false,
        canDownload: false,
      });

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: fileList } });
      const image = screen.getByRole('img');

      expect(image).toHaveAttribute('src', 'http://localhost:4000/assets/test.png');
    });
  });
});
