import getExtension from '../getExtension';

describe('UPLOAD | utils | getExtension', () => {
  it('should return png if mime string is image/png', () => {
    const mime = 'image/png';
    const expected = 'png';

    expect(getExtension(mime)).toEqual(expected);
  });

  it('should return mp4 if mime string is video/mp4', () => {
    const mime = 'video/mp4';
    const expected = 'mp4';

    expect(getExtension(mime)).toEqual(expected);
  });

  it('should return html if mime string is text/html', () => {
    const mime = 'text/html';
    const expected = 'html';

    expect(getExtension(mime)).toEqual(expected);
  });

  it('should return pdf if mime string is application/pdf', () => {
    const mime = 'application/pdf';
    const expected = 'pdf';

    expect(getExtension(mime)).toEqual(expected);
  });
});
