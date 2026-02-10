import storeUtils from '../store';

const mockGet = jest.fn();
const mockSet = jest.fn();

describe('store utils', () => {
  beforeEach(() => {
    global.strapi = {
      store: jest.fn(() => ({
        get: mockGet,
        set: mockSet,
      })),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setModelConfiguration', () => {
    test('persists normal non-null values', async () => {
      mockGet.mockResolvedValue({
        settings: { pageSize: 10 },
        metadatas: {},
        layouts: { list: [], edit: [] },
      });

      await storeUtils.setModelConfiguration('content_types::api::article.article', {
        settings: { pageSize: 25 },
        metadatas: {
          title: {
            edit: { label: 'Title', description: 'Enter a title', placeholder: 'My title' },
            list: { label: 'Title' },
          },
        },
        layouts: { list: ['title'], edit: [] },
      });

      expect(mockSet).toHaveBeenCalledWith({
        key: 'configuration_content_types::api::article.article',
        value: expect.objectContaining({
          settings: { pageSize: 25 },
          metadatas: {
            title: {
              edit: { label: 'Title', description: 'Enter a title', placeholder: 'My title' },
              list: { label: 'Title' },
            },
          },
        }),
      });
    });

    test('persists null values to allow clearing fields', async () => {
      mockGet.mockResolvedValue({
        settings: {},
        metadatas: {
          title: {
            edit: { label: 'Title', description: 'Some description', placeholder: 'Some placeholder' },
            list: { label: 'Title' },
          },
        },
        layouts: { list: [], edit: [] },
      });

      await storeUtils.setModelConfiguration('content_types::api::article.article', {
        settings: {},
        metadatas: {
          title: {
            edit: { label: 'Title', description: null, placeholder: null },
            list: { label: 'Title' },
          },
        },
        layouts: { list: [], edit: [] },
      });

      expect(mockSet).toHaveBeenCalledWith({
        key: 'configuration_content_types::api::article.article',
        value: expect.objectContaining({
          metadatas: {
            title: {
              edit: { label: 'Title', description: null, placeholder: null },
              list: { label: 'Title' },
            },
          },
        }),
      });
    });

    test('persists empty string values to allow clearing fields', async () => {
      mockGet.mockResolvedValue({
        settings: {},
        metadatas: {
          title: {
            edit: { label: 'Title', description: 'Old description', placeholder: 'Old placeholder' },
            list: { label: 'Title' },
          },
        },
        layouts: { list: [], edit: [] },
      });

      await storeUtils.setModelConfiguration('content_types::api::article.article', {
        settings: {},
        metadatas: {
          title: {
            edit: { label: 'Title', description: '', placeholder: '' },
            list: { label: 'Title' },
          },
        },
        layouts: { list: [], edit: [] },
      });

      expect(mockSet).toHaveBeenCalledWith({
        key: 'configuration_content_types::api::article.article',
        value: expect.objectContaining({
          metadatas: {
            title: {
              edit: { label: 'Title', description: '', placeholder: '' },
              list: { label: 'Title' },
            },
          },
        }),
      });
    });

    test('skips undefined values', async () => {
      mockGet.mockResolvedValue({
        settings: { pageSize: 10 },
        metadatas: {},
        layouts: { list: [], edit: [] },
      });

      await storeUtils.setModelConfiguration('content_types::api::article.article', {
        settings: { pageSize: 25 },
        metadatas: {},
        layouts: { list: [], edit: [] },
        isComponent: undefined,
      });

      const savedValue = mockSet.mock.calls[0][0].value;
      expect(savedValue).not.toHaveProperty('isComponent');
    });

    test('does not call set when config has not changed', async () => {
      const existingConfig = {
        settings: { pageSize: 10 },
        metadatas: {},
        layouts: { list: [], edit: [] },
      };

      mockGet.mockResolvedValue(existingConfig);

      await storeUtils.setModelConfiguration('content_types::api::article.article', {
        settings: { pageSize: 10 },
        metadatas: {},
        layouts: { list: [], edit: [] },
      });

      expect(mockSet).not.toHaveBeenCalled();
    });

    test('persists top-level null values', async () => {
      mockGet.mockResolvedValue({
        settings: { pageSize: 10 },
        metadatas: { title: { edit: {}, list: {} } },
        layouts: { list: [], edit: [] },
      });

      await storeUtils.setModelConfiguration('content_types::api::article.article', {
        settings: null,
        metadatas: { title: { edit: {}, list: {} } },
        layouts: { list: [], edit: [] },
      });

      expect(mockSet).toHaveBeenCalledWith({
        key: 'configuration_content_types::api::article.article',
        value: expect.objectContaining({
          settings: null,
        }),
      });
    });
  });
});
