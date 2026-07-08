import { render, screen } from '@tests/utils';

import { AssetPreview } from '../components/AssetDetails/AssetPreview';

import type { File } from '../../../../../../shared/contracts/files';

const createImageAsset = (overrides: Partial<File> = {}): File => ({
  id: 1,
  name: 'photo.jpg',
  hash: 'hash_1',
  alternativeText: 'A photo',
  ext: '.jpg',
  mime: 'image/jpeg',
  url: 'http://example.com/photo.jpg',
  formats: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  ...overrides,
});

describe('future | AssetPreview', () => {
  // #26581: a signed URL's query string is part of the SigV4
  // signature, so appending a cache-buster invalidates it (403). The preview
  // must leave signed URLs untouched.
  it('does not append a cache-buster to signed URLs', () => {
    render(
      <AssetPreview
        asset={createImageAsset({
          url: 'http://example.com/photo.jpg?X-Amz-Signature=abc',
          isUrlSigned: true,
        })}
      />
    );

    const img = screen.getByRole('img', { name: 'A photo' });
    // The signed URL is used verbatim — no `v=` cache-buster appended.
    expect(img).toHaveAttribute('src', 'http://example.com/photo.jpg?X-Amz-Signature=abc');
  });

  it('appends a cache-buster to unsigned URLs', () => {
    render(<AssetPreview asset={createImageAsset({ isUrlSigned: false })} />);

    // updatedAt (2024-01-02) -> epoch ms appended as ?v=
    expect(screen.getByRole('img', { name: 'A photo' })).toHaveAttribute(
      'src',
      expect.stringMatching(/[?&]v=\d+$/)
    );
  });

  it('loads signed remote images with crossOrigin="anonymous"', () => {
    render(<AssetPreview asset={createImageAsset({ isUrlSigned: true })} />);

    expect(screen.getByRole('img', { name: 'A photo' })).toHaveAttribute(
      'crossorigin',
      'anonymous'
    );
  });

  it('does not set crossOrigin for unsigned remote assets (#26581 regression)', () => {
    // Public/unsigned remote images are cache-busted, so they must render
    // without requiring a bucket CORS rule.
    render(<AssetPreview asset={createImageAsset({ isUrlSigned: false })} />);

    expect(screen.getByRole('img', { name: 'A photo' })).not.toHaveAttribute('crossorigin');
  });

  it('does not set crossOrigin for local assets', () => {
    render(<AssetPreview asset={createImageAsset({ isLocal: true, isUrlSigned: true })} />);

    expect(screen.getByRole('img', { name: 'A photo' })).not.toHaveAttribute('crossorigin');
  });
});
