import getType from '../getType';

describe('UPLOAD | utils | getType', () => {
  it('should return file if mime does not exits', () => {
    const mime = undefined;
    const expected = 'file';

    expect(getType(mime)).toEqual(expected);
  });

  it('should return image if mime string contains image', () => {
    const mime = 'image/png';
    const expected = 'image';

    expect(getType(mime)).toEqual(expected);
  });

  it('should return video if mime string contains video', () => {
    const mime = 'video/mp4';
    const expected = 'video';

    expect(getType(mime)).toEqual(expected);
  });

  it('should return file if mime string is text/html', () => {
    const mime = 'text/html';
    const expected = 'file';

    expect(getType(mime)).toEqual(expected);
  });

  it('should return file if mime string is application/pdf', () => {
    const mime = 'application/pdf';
    const expected = 'file';

    expect(getType(mime)).toEqual(expected);
  });
});
