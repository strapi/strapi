import { resolveFileMime } from '../resolveFileMime';

const createMinimalQuickTimeBlob = (): Blob =>
  new Blob([
    new Uint8Array([
      0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0x00, 0x00, 0x00,
      0x00, 0x71, 0x74, 0x20, 0x20,
    ]).buffer,
  ]);

describe('resolveFileMime', () => {
  it('keeps a specific declared MIME type without reading the file', async () => {
    const blob = createMinimalQuickTimeBlob();

    await expect(resolveFileMime('video/mp4', blob)).resolves.toBe('video/mp4');
  });

  it('sniffs video/quicktime from QuickTime bytes when the browser reports application/octet-stream (#23788)', async () => {
    const blob = createMinimalQuickTimeBlob();

    await expect(resolveFileMime('application/octet-stream', blob)).resolves.toBe(
      'video/quicktime'
    );
  });

  it('sniffs video/quicktime when the declared type is empty', async () => {
    const blob = createMinimalQuickTimeBlob();

    await expect(resolveFileMime('', blob)).resolves.toBe('video/quicktime');
  });

  it('does not trust a .mov filename when the bytes are not a known type', async () => {
    const blob = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer]);
    const file = new File([blob], 'clip.mov', { type: 'application/octet-stream' });

    await expect(resolveFileMime(file.type, file)).resolves.toBe('application/octet-stream');
  });

  it('leaves application/octet-stream unchanged when there is no file to sniff', async () => {
    await expect(resolveFileMime('application/octet-stream')).resolves.toBe(
      'application/octet-stream'
    );
  });

  it('strips MIME parameters before treating the type as generic, then sniffs', async () => {
    const blob = createMinimalQuickTimeBlob();

    await expect(resolveFileMime('application/octet-stream; charset=binary', blob)).resolves.toBe(
      'video/quicktime'
    );
  });
});
