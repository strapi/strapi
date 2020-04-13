import getFileExtension from '../getFileExtension';

describe('HELPER PLUGIN | utils | getFileExtension', () => {
  it('should return undefined if mime does not exits', () => {
    const mime = null;
    const expected = 'undefined';

    expect(getFileExtension(mime)).toEqual(expected);
  });

  it('should return png if mime string is image/png', () => {
    const mime = 'image/png';
    const expected = 'png';

    expect(getFileExtension(mime)).toEqual(expected);
  });

  it('should return mp4 if mime string is video/mp4', () => {
    const mime = 'video/mp4';
    const expected = 'mp4';

    expect(getFileExtension(mime)).toEqual(expected);
  });

  it('should return html if mime string is text/html', () => {
    const mime = 'text/html';
    const expected = 'html';

    expect(getFileExtension(mime)).toEqual(expected);
  });

  it('should return pdf if mime string is application/pdf', () => {
    const mime = 'application/pdf';
    const expected = 'pdf';

    expect(getFileExtension(mime)).toEqual(expected);
  });
});
