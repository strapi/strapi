import { getAllowedFiles } from '../getAllowedFiles';

const COMMON_PROPERTIES = {
  size: 100,
  createdAt: '2021-09-01T00:00:00.000Z',
  updatedAt: '2021-09-01T00:00:00.000Z',
  folder: null,
  folderPath: '/',
  documentId: 'documentId',
  hash: 'hash',
  locale: null,
  provider: 'local',
  isSelectable: true,
  type: 'asset',
};

const FILE_1 = {
  id: 1,
  mime: 'application',
  name: 'file.application',
  url: '/uploads/file.application',
  ...COMMON_PROPERTIES,
};

const FILE_2 = {
  id: 2,
  mime: 'application',
  name: 'file2.application',
  url: '/uploads/file2.application',
  ...COMMON_PROPERTIES,
};

const FILE_3 = {
  id: 3,
  mime: 'image/png',
  name: 'image.png',
  url: '/uploads/image.png',
  ...COMMON_PROPERTIES,
};

const FILE_4 = {
  id: 4,
  mime: 'video/mov',
  name: 'video.mov',
  url: '/uploads/video.mov',
  ...COMMON_PROPERTIES,
};

const FILE_5 = {
  id: 5,
  mime: 'image/jpg',
  name: 'image2.jpg',
  url: '/uploads/image2.jpg',
  ...COMMON_PROPERTIES,
};

const FILE_6 = {
  id: 6,
  mime: 'image/test',
  name: 'image.test',
  url: '/uploads/image.test',
  ...COMMON_PROPERTIES,
};

const FILE_7 = {
  id: 7,
  mime: 'audio/mpeg',
  name: 'audio.mpeg',
  url: '/uploads/audio.mpeg',
  ...COMMON_PROPERTIES,
};

const FILE_8 = {
  id: 8,
  mime: 'audio/x-wav',
  name: 'audio.x-wav',
  url: '/uploads/audio.x-wav',
  ...COMMON_PROPERTIES,
};

const FILE_9 = {
  id: 9,
  mime: 'audio/ogg',
  name: 'audio.ogg',
  url: '/uploads/audio.ogg',
  ...COMMON_PROPERTIES,
};

const files = [FILE_1, FILE_2, FILE_3, FILE_4, FILE_5, FILE_6, FILE_7, FILE_8, FILE_9];

describe('UPLOAD | components | MediaLibraryInput | utils | getAllowedFiles', () => {
  it('returns an empty array of when the allowed files is empty', () => {
    const results = getAllowedFiles([], files);

    expect(results).toEqual([]);
  });

  it('returns an array with elements that are not video or image when the allowedTypes is files', () => {
    const results = getAllowedFiles(['files'], files);

    expect(results).toEqual([FILE_1, FILE_2]);
  });

  it('returns an array with elements that are only video when the allowedTypes is videos', () => {
    const results = getAllowedFiles(['videos'], files);

    expect(results).toEqual([FILE_4]);
  });

  it('returns an array with elements that are only video when the allowedTypes is videos', () => {
    const results = getAllowedFiles(['audios'], files);

    expect(results).toEqual([FILE_7, FILE_8, FILE_9]);
  });

  it('returns an array with elements that are only image when the allowedTypes is images', () => {
    const results = getAllowedFiles(['images'], files);

    expect(results).toEqual([FILE_3, FILE_5, FILE_6]);
  });

  it('returns an array with elements that are image and video when the allowedTypes are videos and images', () => {
    const results = getAllowedFiles(['videos', 'images', 'audios'], files);

    expect(results).toEqual([FILE_3, FILE_4, FILE_5, FILE_6, FILE_7, FILE_8, FILE_9]);
  });

  it('returns an array with all the elements', () => {
    const results = getAllowedFiles(['videos', 'images', 'files', 'audios'], files);

    expect(results).toEqual(files);
  });
});
