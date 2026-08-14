import { ASSET_SOURCES } from '../../constants';
import { ASSET_TYPES } from '../../enums';
import { rawFileToAsset } from '../rawFileToAsset';

/**
 * ISO BMFF ftyp box with QuickTime brand (`qt  `) — what file-type recognizes as video/quicktime.
 */
const createMinimalQuickTimeFile = (name: string, type: string, lastModified?: number): File =>
  new File(
    [
      new Uint8Array([
        0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0x00, 0x00, 0x00,
        0x00, 0x71, 0x74, 0x20, 0x20,
      ]).buffer,
    ],
    name,
    { type, lastModified }
  );

describe('rawFileToAsset', () => {
  it('classifies a QuickTime file as video when the browser reports application/octet-stream (#23788)', async () => {
    const rawFile = createMinimalQuickTimeFile(
      'sample_960x400_ocean_with_audio.mov',
      'application/octet-stream',
      Date.parse('2025-06-20T19:42:43.857Z')
    );

    const asset = await rawFileToAsset(rawFile, ASSET_SOURCES.Computer);

    expect(asset.mime).toBe('video/quicktime');
    expect(asset.type).toBe(ASSET_TYPES.Video);
    expect(asset.ext).toBe('mov');
  });

  it('keeps a declared non-generic MIME type', async () => {
    const rawFile = createMinimalQuickTimeFile(
      'clip.mov',
      'video/quicktime',
      Date.parse('2025-06-20T19:42:43.857Z')
    );

    const asset = await rawFileToAsset(rawFile, ASSET_SOURCES.Computer);

    expect(asset.mime).toBe('video/quicktime');
    expect(asset.type).toBe(ASSET_TYPES.Video);
  });

  it('does not classify unrecognized bytes as video just because the name is .mov', async () => {
    const rawFile = new File([new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer], 'clip.mov', {
      type: 'application/octet-stream',
    });

    const asset = await rawFileToAsset(rawFile, ASSET_SOURCES.Computer);

    expect(asset.mime).toBe('application/octet-stream');
    expect(asset.type).toBe(ASSET_TYPES.Document);
  });
});
