import getFileExtension from '../getFileExtension';

describe('getFileExtension', () => {
  it('should return undefined if ext does not exits', () => {
    const ext = null;
    const expected = null;

    // @ts-expect-error ext should be a string so will throw error that ext is null.
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
