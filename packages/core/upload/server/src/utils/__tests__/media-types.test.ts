import { describeMediaTypes, isMediaTypeAllowed } from '../media-types';

describe('isMediaTypeAllowed', () => {
  test('a field without allowedTypes takes anything', () => {
    expect(isMediaTypeAllowed(undefined, 'application/pdf')).toBe(true);
    expect(isMediaTypeAllowed(null, 'image/png')).toBe(true);
    expect(isMediaTypeAllowed([], undefined)).toBe(true);
  });

  test('matches each media kind', () => {
    expect(isMediaTypeAllowed(['images'], 'image/png')).toBe(true);
    expect(isMediaTypeAllowed(['videos'], 'video/mp4')).toBe(true);
    expect(isMediaTypeAllowed(['audios'], 'audio/mpeg')).toBe(true);
    expect(isMediaTypeAllowed(['images'], 'application/pdf')).toBe(false);
    expect(isMediaTypeAllowed(['images'], 'video/mp4')).toBe(false);
  });

  test('files takes anything that is not an image, video or audio', () => {
    expect(isMediaTypeAllowed(['files'], 'application/pdf')).toBe(true);
    expect(isMediaTypeAllowed(['files'], 'text/plain')).toBe(true);
    expect(isMediaTypeAllowed(['files'], 'image/png')).toBe(false);
    expect(isMediaTypeAllowed(['files', 'images'], 'image/png')).toBe(true);
  });

  test('a file without a mime type only fits where files is allowed', () => {
    expect(isMediaTypeAllowed(['files'], undefined)).toBe(true);
    expect(isMediaTypeAllowed(['images'], null)).toBe(false);
  });

  test('ignores the case of the mime type', () => {
    expect(isMediaTypeAllowed(['images'], 'Image/PNG')).toBe(true);
  });
});

describe('describeMediaTypes', () => {
  test('names the types in plain words', () => {
    expect(describeMediaTypes(['images'])).toBe('images');
    expect(describeMediaTypes(['images', 'videos'])).toBe('images or videos');
    expect(describeMediaTypes(['audios', 'files'])).toBe('audio or files');
  });
});
