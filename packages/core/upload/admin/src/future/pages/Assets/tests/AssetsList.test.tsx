import { DesignSystemProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { AssetsList } from '../components/AssetsList';

import type { File } from '../../../../../../shared/contracts/files';

const createMockAsset = (id: number, name: string, mime = 'image/png', ext = '.png'): File => ({
  id,
  name,
  hash: `hash_${id}`,
  alternativeText: `Alt text for ${name}`,
  ext,
  mime,
  url: `http://example.com/${name}`,
  formats: { thumbnail: { url: `http://example.com/thumb_${name}` } },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const mockAssets: File[] = [
  createMockAsset(1, 'image1.png'),
  createMockAsset(2, 'image2.png'),
  createMockAsset(3, 'image3.png'),
];

interface SetupProps {
  assets?: File[];
}

const setup = ({ assets = mockAssets }: SetupProps = {}) =>
  render(
    <MemoryRouter>
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <AssetsList assets={assets} />
        </DesignSystemProvider>
      </IntlProvider>
    </MemoryRouter>
  );

describe('AssetsList', () => {
  describe('Table rendering', () => {
    it('renders a table element', () => {
      const { container } = setup();
      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('renders asset names in the table', () => {
      setup();
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
      expect(screen.getByText('image3.png')).toBeInTheDocument();
    });
  });

  describe('AssetPreviewCell', () => {
    describe('Image assets', () => {
      it('renders image thumbnail for image/jpeg', () => {
        setup({ assets: [createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg')] });
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'Alt text for test.jpg');
      });

      it('renders image thumbnail for image/png', () => {
        setup({ assets: [createMockAsset(1, 'test.png', 'image/png', '.png')] });
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      it('renders empty alt when alternativeText is not provided', () => {
        const asset = createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg');
        asset.alternativeText = null;
        const { container } = setup({ assets: [asset] });
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('alt', '');
      });

      it('uses thumbnail format url when available', () => {
        const asset = createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg');
        asset.formats = { thumbnail: { url: '/uploads/thumb.jpg' } };
        setup({ assets: [asset] });
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      it('falls back to original url when no thumbnail', () => {
        const asset = createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg');
        asset.formats = null;
        setup({ assets: [asset] });
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });

    describe('Video assets', () => {
      it('renders icon for video/mp4', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'video.mp4', 'video/mp4', '.mp4')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders icon for video/webm', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'video.webm', 'video/webm', '.webm')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    describe('Audio assets', () => {
      it('renders icon for audio/mp3', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'audio.mp3', 'audio/mp3', '.mp3')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders icon for audio/wav', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'audio.wav', 'audio/wav', '.wav')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    describe('Document assets', () => {
      it('renders icon for application/pdf', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'doc.pdf', 'application/pdf', '.pdf')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders icon for text/csv', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'data.csv', 'text/csv', '.csv')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders icon for Excel files', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'spreadsheet.xls', 'application/vnd.ms-excel', '.xls')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders icon for zip files', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'archive.zip', 'application/zip', '.zip')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders generic icon for unknown document types', () => {
        const { container } = setup({
          assets: [createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin')],
        });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('renders generic icon when ext is undefined', () => {
        const asset = createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin');
        asset.ext = undefined;
        const { container } = setup({ assets: [asset] });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    describe('Edge cases', () => {
      it('handles missing mime type', () => {
        const asset = createMockAsset(1, 'file.txt', '', '.txt');
        asset.mime = undefined;
        const { container } = setup({ assets: [asset] });
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});
