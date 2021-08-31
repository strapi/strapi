import getFileExtension from '../getFileExtension';

describe('HELPER PLUGIN | utils | getFileExtension', () => {
  it('should return undefined if ext does not exits', () => {
    const ext = null;
    const expected = null;

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return png if ext is .png', () => {
    const ext = '.png';
    const expected = 'png';

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return mp4 if ext is .mp4', () => {
    const ext = '.mp4';
    const expected = 'mp4';

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return html if ext is .bin', () => {
    const ext = '.bin';
    const expected = 'bin';

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return pdf if ext is .pdf', () => {
    const ext = '.pdf';
    const expected = 'pdf';

    expect(getFileExtension(ext)).toEqual(expected);
  });
});
