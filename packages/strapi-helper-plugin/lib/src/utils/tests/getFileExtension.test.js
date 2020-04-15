import getFileExtension from '../getFileExtension';

describe('HELPER PLUGIN | utils | getFileExtension', () => {
  it('should return undefined if ext does not exits', () => {
    const ext = null;
    const expected = null;

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return png if ext string is image/png', () => {
    const ext = '.png';
    const expected = 'png';

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return mp4 if ext string is video/mp4', () => {
    const ext = '.mp4';
    const expected = 'mp4';

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return html if ext string is text/html', () => {
    const ext = '.bin';
    const expected = 'bin';

    expect(getFileExtension(ext)).toEqual(expected);
  });

  it('should return pdf if ext string is application/pdf', () => {
    const ext = '.pdf';
    const expected = 'pdf';

    expect(getFileExtension(ext)).toEqual(expected);
  });
});
