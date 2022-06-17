import getAllowedFiles from '../getAllowedFiles';

const files = [
  {
    id: 1,
    mime: 'application',
  },
  {
    id: 2,
    mime: 'application',
  },
  {
    id: 3,
    mime: 'image/png',
  },
  {
    id: 4,
    mime: 'video/mov',
  },
  {
    id: 5,
    mime: 'image/jpg',
  },
  {
    id: 6,
    mime: 'image/test',
  },
  {
    id: 7,
    mime: 'audio/mpeg',
  },
  {
    id: 8,
    mime: 'audio/x-wav',
  },
  {
    id: 9,
    mime: 'audio/ogg',
  },
];

describe('UPLOAD | components | MediaLibraryInput | utils | getAllowedFiles', () => {
  it('returns an empty array of when the allowed files is empty', () => {
    const results = getAllowedFiles([], files);

    expect(results).toEqual([]);
  });

  it('returns an array with elements that are not video or image when the allowedTypes is files', () => {
    const results = getAllowedFiles(['files'], files);

    expect(results).toEqual([
      {
        id: 1,
        mime: 'application',
      },
      {
        id: 2,
        mime: 'application',
      },
    ]);
  });

  it('returns an array with elements that are only video when the allowedTypes is videos', () => {
    const results = getAllowedFiles(['videos'], files);

    expect(results).toEqual([
      {
        id: 4,
        mime: 'video/mov',
      },
    ]);
  });

  it('returns an array with elements that are only video when the allowedTypes is videos', () => {
    const results = getAllowedFiles(['audios'], files);

    expect(results).toEqual([
      {
        id: 7,
        mime: 'audio/mpeg',
      },
      {
        id: 8,
        mime: 'audio/x-wav',
      },
      {
        id: 9,
        mime: 'audio/ogg',
      },
    ]);
  });

  it('returns an array with elements that are only image when the allowedTypes is images', () => {
    const results = getAllowedFiles(['images'], files);

    expect(results).toEqual([
      {
        id: 3,
        mime: 'image/png',
      },
      {
        id: 5,
        mime: 'image/jpg',
      },
      {
        id: 6,
        mime: 'image/test',
      },
    ]);
  });

  it('returns an array with elements that are image and video when the allowedTypes are videos and images', () => {
    const results = getAllowedFiles(['videos', 'images', 'audios'], files);

    expect(results).toEqual([
      {
        id: 3,
        mime: 'image/png',
      },
      {
        id: 4,
        mime: 'video/mov',
      },
      {
        id: 5,
        mime: 'image/jpg',
      },
      {
        id: 6,
        mime: 'image/test',
      },
      {
        id: 7,
        mime: 'audio/mpeg',
      },
      {
        id: 8,
        mime: 'audio/x-wav',
      },
      {
        id: 9,
        mime: 'audio/ogg',
      },
    ]);
  });

  it('returns an array with all the elements', () => {
    const results = getAllowedFiles(['videos', 'images', 'files', 'audios'], files);

    expect(results).toEqual(files);
  });
});
