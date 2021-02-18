import formatFileForEditing from '../formatFileForEditing';

describe('UPLOAD | utils | formatFileForEditing', () => {
  it('should format a file correctly with bookshelf', () => {
    const data = {
      size: 22.8,
      ext: '.png',
      width: 110,
      caption: 'test',
      previewUrl: null,
      height: 110,
      created_at: '2020-03-23T11:43:46.729Z',
      related: [],
      name: 'test',
      hash: 'Screenshot_2020-03-09_at_17.52.42.png_edbdfb6446',
      url: '/uploads/Screenshot_2020-03-09_at_17.52.42.png_edbdfb6446.png',
      provider: 'local',
      mime: 'image/png',
      updated_at: '2020-03-23T11:43:46.729Z',
      alternativeText: 'test',
      id: 12,
      provider_metadata: null,
      formats: {
        thumbnail: {
          hash: 'thumbnail_Screenshot_2020-03-26_at_13.09.24.png_df7f56f901',
          ext: '.png',
          mime: 'image/png',
          width: 245,
          height: 23,
          size: 4.09,
          url: '/uploads/thumbnail_Screenshot_2020-03-26_at_13.09.24.png_df7f56f901.png',
        },
      },
    };
    const abortController = new AbortController();

    const expected = {
      abortController,
      id: 12,
      file: {
        size: 22.8,
        name: 'test',
        ext: '.png',
        width: 110,
        height: 110,
        created_at: '2020-03-23T11:43:46.729Z',
        url: '/uploads/Screenshot_2020-03-09_at_17.52.42.png_edbdfb6446.png',
        mime: 'image/png',
      },
      fileInfo: {
        caption: 'test',
        alternativeText: 'test',
        name: 'test',
      },
      hasError: false,
      errorMessage: null,
      isUploading: false,
    };

    expect(formatFileForEditing(data)).toEqual(expected);
  });

  it('should format a file correctly with mongoose', () => {
    const data = {
      size: 22.8,
      ext: '.png',
      width: 110,
      caption: 'test',
      previewUrl: null,
      height: 110,
      createdAt: '2020-03-23T11:43:46.729Z',
      related: [],
      name: 'test',
      hash: 'Screenshot_2020-03-09_at_17.52.42.png_edbdfb6446',
      url: '/uploads/Screenshot_2020-03-09_at_17.52.42.png_edbdfb6446.png',
      provider: 'local',
      mime: 'image/png',
      updated_at: '2020-03-23T11:43:46.729Z',
      alternativeText: 'test',
      id: 12,
      formats: {
        thumbnail: {
          hash: 'thumbnail_Screenshot_2020-03-26_at_13.09.24.png_df7f56f901',
          ext: '.png',
          mime: 'image/png',
          width: 245,
          height: 23,
          size: 4.09,
          url: '/uploads/thumbnail_Screenshot_2020-03-26_at_13.09.24.png_df7f56f901.png',
        },
      },
      provider_metadata: null,
    };
    const abortController = new AbortController();
    const expected = {
      abortController,
      id: 12,
      file: {
        size: 22.8,
        ext: '.png',
        name: 'test',
        width: 110,
        height: 110,
        created_at: '2020-03-23T11:43:46.729Z',
        url: '/uploads/Screenshot_2020-03-09_at_17.52.42.png_edbdfb6446.png',
        mime: 'image/png',
      },
      fileInfo: {
        alternativeText: 'test',
        caption: 'test',
        name: 'test',
      },
      hasError: false,
      errorMessage: null,
      isUploading: false,
    };

    expect(formatFileForEditing(data)).toEqual(expected);
  });
});
