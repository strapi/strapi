import { ASSET_SOURCES } from '../../constants';
import { ASSET_TYPES } from '../../enums';
import { rawFileToAsset } from '../rawFileToAsset';

import type { RawFile } from '../../../../shared/contracts/files';

const createRawFile = (overrides: Partial<RawFile> & Pick<RawFile, 'name' | 'type'>): RawFile =>
  ({
    size: 1024,
    lastModified: Date.parse('2025-06-20T19:42:43.857Z'),
    ...overrides,
  }) as RawFile;

describe('rawFileToAsset', () => {
  it('classifies a .mov file as video when the browser reports application/octet-stream (#23788)', () => {
    // Windows File.type for QuickTime is often empty or application/octet-stream
    const rawFile = createRawFile({
      name: 'sample_960x400_ocean_with_audio.mov',
      type: 'application/octet-stream',
    });

    const asset = rawFileToAsset(rawFile, ASSET_SOURCES.Computer);

    expect(asset.mime).toBe('video/quicktime');
    expect(asset.type).toBe(ASSET_TYPES.Video);
    expect(asset.ext).toBe('mov');
  });

  it('keeps a declared non-generic MIME type', () => {
    const rawFile = createRawFile({
      name: 'clip.mov',
      type: 'video/quicktime',
    });

    const asset = rawFileToAsset(rawFile, ASSET_SOURCES.Computer);

    expect(asset.mime).toBe('video/quicktime');
    expect(asset.type).toBe(ASSET_TYPES.Video);
  });
});
