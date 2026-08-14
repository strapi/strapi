import { resolveFileMime } from '../resolveFileMime';

describe('resolveFileMime', () => {
  it('keeps a specific declared MIME type', () => {
    expect(resolveFileMime('video/mp4', 'clip.mov')).toBe('video/mp4');
  });

  it('infers video/quicktime from a .mov name when the declared type is application/octet-stream', () => {
    expect(resolveFileMime('application/octet-stream', 'sample_960x400_ocean_with_audio.mov')).toBe(
      'video/quicktime'
    );
  });

  it('infers video/quicktime from a .mov name when the declared type is empty', () => {
    expect(resolveFileMime('', 'clip.MOV')).toBe('video/quicktime');
  });

  it('leaves application/octet-stream unchanged when the extension is unknown', () => {
    expect(resolveFileMime('application/octet-stream', 'file.bin')).toBe(
      'application/octet-stream'
    );
  });

  it('strips MIME parameters before treating the type as generic', () => {
    expect(resolveFileMime('application/octet-stream; charset=binary', 'clip.mov')).toBe(
      'video/quicktime'
    );
  });
});
