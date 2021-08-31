import getFilesToDownload from '../getFilesToDownload';

describe('UPLOAD | utils | getFilesToDownload', () => {
  it('should return an array containing only the files that have the isDownloading key to true', () => {
    const data = [
      {
        fileURL: '1',
        isDownloading: undefined,
      },
      {
        fileURL: '2',
        isDownloading: null,
      },
      {
        fileURL: '3',
        isDownloading: 'true',
      },
      {
        fileURL: '4',
        isDownloading: false,
      },
      {
        fileURL: '5',
        isDownloading: true,
      },
    ];
    const expected = [
      {
        fileURL: '5',
        isDownloading: true,
      },
    ];

    expect(getFilesToDownload(data)).toEqual(expected);
  });
});
