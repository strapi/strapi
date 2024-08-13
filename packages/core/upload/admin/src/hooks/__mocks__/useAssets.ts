export const useAssets = jest.fn().mockReturnValue({
  isLoading: false,
  error: null,
  data: {
    pagination: {
      pageCount: 1,
      page: 1,
      pageSize: 10,
      total: 1,
    },

    results: [
      {
        id: 77,
        name: '3874873.jpg',
        alternativeText: null,
        caption: null,
        width: 400,
        height: 400,
        formats: {
          thumbnail: {
            name: 'thumbnail_3874873.jpg',
            hash: 'thumbnail_3874873_b5818bb250',
            ext: '.jpg',
            mime: 'image/jpeg',
            width: 156,
            height: 156,
            size: 3.97,
            path: null,
            url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
          },
        },
        hash: '3874873_b5818bb250',
        ext: '.jpg',
        mime: 'image/jpeg',
        size: 11.79,
        url: '/uploads/3874873_b5818bb250.jpg',
        previewUrl: null,
        provider: 'local',
        provider_metadata: null,
        createdAt: '2021-10-18T08:04:56.326Z',
        updatedAt: '2021-10-18T08:04:56.326Z',
      },
    ],
  },
});
