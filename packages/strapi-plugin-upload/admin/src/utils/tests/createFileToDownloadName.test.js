import createFileToDownloadName from '../createFileToDownloadName';

describe('UPLOAD | utils | createFileToDownloadName', () => {
  it('should return a downloadable name if the name contains the extension', () => {
    const data = {
      file: {
        ext: '.png',
      },
      fileInfo: {
        name: 'test.png',
      },
    };
    const expected = 'test.png';

    expect(createFileToDownloadName(data)).toEqual(expected);
  });

  it('should return a downloadable name if the name does not contain the extension', () => {
    const data = {
      file: {
        ext: '.png',
      },
      fileInfo: {
        name: 'test',
      },
    };
    const expected = 'test.png';

    expect(createFileToDownloadName(data)).toEqual(expected);
  });
});
