import { render, screen } from '@tests/utils';

import { AssetsGrid } from '../components/AssetsGrid';

jest.mock('@strapi/icons', () => ({
  ...jest.requireActual('@strapi/icons'),
  File: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-file">
      <title>File</title>
    </svg>
  ),
  FileCsv: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-file-csv">
      <title>FileCsv</title>
    </svg>
  ),
  FilePdf: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-file-pdf">
      <title>FilePdf</title>
    </svg>
  ),
  FileXls: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-file-xls">
      <title>FileXls</title>
    </svg>
  ),
  FileZip: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-file-zip">
      <title>FileZip</title>
    </svg>
  ),
  Images: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-images">
      <title>Images</title>
    </svg>
  ),
  Monitor: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-monitor">
      <title>Monitor</title>
    </svg>
  ),
  More: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-more">
      <title>More</title>
    </svg>
  ),
  VolumeUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid="icon-volume-up">
      <title>VolumeUp</title>
    </svg>
  ),
}));

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

const setup = ({ assets = mockAssets }: SetupProps = {}) => render(<AssetsGrid assets={assets} />);

describe('AssetsGrid', () => {
  describe('Grid rendering', () => {
    it('renders asset cards in a grid', () => {
      setup();
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
      expect(screen.getByText('image3.png')).toBeInTheDocument();
    });

    it('renders empty state when no assets', () => {
      setup({ assets: [] });
      expect(screen.getByText('No content found')).toBeInTheDocument();
    });
  });

  describe('AssetCard', () => {
    describe('Image assets', () => {
      it('renders image preview for image/jpeg', () => {
        setup({ assets: [createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg')] });
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'Alt text for test.jpg');
      });

      it('renders presentational image when alternativeText is not provided', () => {
        const asset = createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg');
        asset.alternativeText = null;
        setup({ assets: [asset] });

        const img = screen.getByRole('presentation');
        expect(img).toHaveAttribute('alt', '');
      });

      it('renders image preview for image/png', () => {
        setup({ assets: [createMockAsset(1, 'test.png', 'image/png', '.png')] });
        expect(screen.getByRole('img')).toBeInTheDocument();
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

    describe('renders cards for all media types', () => {
      it.each([
        ['video/mp4', '.mp4', 'video.mp4'],
        ['video/webm', '.webm', 'video.webm'],
        ['audio/mp3', '.mp3', 'audio.mp3'],
        ['audio/wav', '.wav', 'audio.wav'],
        ['application/pdf', '.pdf', 'doc.pdf'],
        ['text/csv', '.csv', 'data.csv'],
        ['application/vnd.ms-excel', '.xls', 'spreadsheet.xls'],
        ['application/zip', '.zip', 'archive.zip'],
        ['application/octet-stream', '.bin', 'file.bin'],
      ])('renders card for %s files', (mime, ext, filename) => {
        setup({ assets: [createMockAsset(1, filename, mime, ext)] });
        expect(screen.getByText(filename)).toBeInTheDocument();
      });
    });

    describe('Media type icons', () => {
      it('renders Images icon for image assets', () => {
        setup({ assets: [createMockAsset(1, 'photo.jpg', 'image/jpeg', '.jpg')] });
        expect(screen.getByTestId('icon-images')).toBeInTheDocument();
        expect(screen.getByRole('img')).toBeInTheDocument(); // actual thumbnail
      });

      it('renders Monitor icon for video assets', () => {
        setup({ assets: [createMockAsset(1, 'video.mp4', 'video/mp4', '.mp4')] });
        expect(screen.getAllByTestId('icon-monitor')).toHaveLength(2); // preview + footer
      });

      it('renders VolumeUp icon for audio assets', () => {
        setup({ assets: [createMockAsset(1, 'audio.mp3', 'audio/mp3', '.mp3')] });
        expect(screen.getAllByTestId('icon-volume-up')).toHaveLength(2);
      });

      it('renders FilePdf icon for PDF documents', () => {
        setup({ assets: [createMockAsset(1, 'doc.pdf', 'application/pdf', '.pdf')] });
        expect(screen.getAllByTestId('icon-file-pdf')).toHaveLength(2);
      });

      it('renders FileCsv icon for CSV files', () => {
        setup({ assets: [createMockAsset(1, 'data.csv', 'text/csv', '.csv')] });
        expect(screen.getAllByTestId('icon-file-csv')).toHaveLength(2);
      });

      it('renders FileXls icon for Excel files', () => {
        setup({ assets: [createMockAsset(1, 'sheet.xls', 'application/vnd.ms-excel', '.xls')] });
        expect(screen.getAllByTestId('icon-file-xls')).toHaveLength(2);
      });

      it('renders FileZip icon for ZIP archives', () => {
        setup({ assets: [createMockAsset(1, 'archive.zip', 'application/zip', '.zip')] });
        expect(screen.getAllByTestId('icon-file-zip')).toHaveLength(2);
      });

      it('renders generic File icon for unknown document types', () => {
        setup({ assets: [createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin')] });
        expect(screen.getAllByTestId('icon-file')).toHaveLength(2);
      });
    });

    describe('More actions button', () => {
      it('renders more actions button for each card', () => {
        setup({ assets: [createMockAsset(1, 'test.png')] });
        expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
      });
    });

    describe('Edge cases', () => {
      it('handles missing mime type', () => {
        const asset = createMockAsset(1, 'file.txt', '', '.txt');
        asset.mime = undefined;
        setup({ assets: [asset] });
        expect(screen.getByText('file.txt')).toBeInTheDocument();
      });

      it('handles missing extension', () => {
        const asset = createMockAsset(1, 'file', 'application/octet-stream', '');
        asset.ext = undefined;
        setup({ assets: [asset] });
        expect(screen.getByText('file')).toBeInTheDocument();
      });
    });
  });
});
