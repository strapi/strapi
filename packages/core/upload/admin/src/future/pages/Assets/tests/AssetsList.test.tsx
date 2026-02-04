import { render, screen } from '@tests/utils';

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

const setup = ({ assets = mockAssets }: SetupProps = {}) => render(<AssetsList assets={assets} />);

describe('AssetsList', () => {
  describe('Table rendering', () => {
    it('renders a table element', () => {
      setup();
      expect(screen.getByRole('gridcell', { name: 'name' })).toBeInTheDocument();
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

      it('renders presentational image when alternativeText is not provided', () => {
        const asset = createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg');
        asset.alternativeText = null;
        setup({ assets: [asset] });
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
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
      it('renders row for video/mp4', () => {
        setup({
          assets: [createMockAsset(1, 'video.mp4', 'video/mp4', '.mp4')],
        });
        expect(screen.getByText('video.mp4')).toBeInTheDocument();
      });

      it('renders row for video/webm', () => {
        setup({
          assets: [createMockAsset(1, 'video.webm', 'video/webm', '.webm')],
        });
        expect(screen.getByText('video.webm')).toBeInTheDocument();
      });
    });

    describe('Audio assets', () => {
      it('renders row for audio/mp3', () => {
        setup({
          assets: [createMockAsset(1, 'audio.mp3', 'audio/mp3', '.mp3')],
        });
        expect(screen.getByText('audio.mp3')).toBeInTheDocument();
      });

      it('renders row for audio/wav', () => {
        setup({
          assets: [createMockAsset(1, 'audio.wav', 'audio/wav', '.wav')],
        });
        expect(screen.getByText('audio.wav')).toBeInTheDocument();
      });
    });

    describe('Document assets', () => {
      it('renders row for application/pdf', () => {
        setup({
          assets: [createMockAsset(1, 'doc.pdf', 'application/pdf', '.pdf')],
        });
        expect(screen.getByText('doc.pdf')).toBeInTheDocument();
      });

      it('renders row for text/csv', () => {
        setup({
          assets: [createMockAsset(1, 'data.csv', 'text/csv', '.csv')],
        });
        expect(screen.getByText('data.csv')).toBeInTheDocument();
      });

      it('renders row for Excel files', () => {
        setup({
          assets: [createMockAsset(1, 'spreadsheet.xls', 'application/vnd.ms-excel', '.xls')],
        });
        expect(screen.getByText('spreadsheet.xls')).toBeInTheDocument();
      });

      it('renders row for zip files', () => {
        setup({
          assets: [createMockAsset(1, 'archive.zip', 'application/zip', '.zip')],
        });
        expect(screen.getByText('archive.zip')).toBeInTheDocument();
      });

      it('renders row for unknown document types', () => {
        setup({
          assets: [createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin')],
        });
        expect(screen.getByText('file.bin')).toBeInTheDocument();
      });

      it('renders row when ext is undefined', () => {
        const asset = createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin');
        asset.ext = undefined;
        setup({ assets: [asset] });
        expect(screen.getByText('file.bin')).toBeInTheDocument();
      });
    });

    describe('Edge cases', () => {
      it('handles missing mime type', () => {
        const asset = createMockAsset(1, 'file.txt', '', '.txt');
        asset.mime = undefined;
        setup({ assets: [asset] });
        expect(screen.getByText('file.txt')).toBeInTheDocument();
      });
    });
  });
});
