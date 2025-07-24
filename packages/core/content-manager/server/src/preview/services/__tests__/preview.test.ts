import { errors } from '@strapi/utils';
import { createPreviewService } from '../preview';

const mockConfig = {
  isConfigured: jest.fn(),
  getPreviewHandler: jest.fn(),
};

const mockStrapi = {
  log: {
    error: jest.fn(),
  },
} as any;

const mockGetService = jest.fn().mockReturnValue(mockConfig);

jest.mock('../../utils', () => ({
  getService: jest.fn().mockImplementation(() => mockGetService()),
}));

describe('Preview Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Throws 404 when preview is not configured', async () => {
    mockConfig.isConfigured.mockReturnValue(false);

    const previewService = createPreviewService({ strapi: mockStrapi });

    await expect(
      previewService.getPreviewUrl('api::article.article', {
        documentId: '',
        locale: '',
        status: 'published',
      })
    ).rejects.toThrow(new errors.NotFoundError('Preview config not found'));

    expect(mockConfig.isConfigured).toHaveBeenCalled();
    expect(mockConfig.getPreviewHandler).not.toHaveBeenCalled();
  });

  test('Calls handler when preview is configured', async () => {
    const mockHandler = jest.fn().mockResolvedValue('http://preview.example.com');
    mockConfig.isConfigured.mockReturnValue(true);
    mockConfig.getPreviewHandler.mockReturnValue(mockHandler);

    const previewService = createPreviewService({ strapi: mockStrapi });
    const params = { documentId: '1', locale: 'en', status: 'published' as const };

    const result = await previewService.getPreviewUrl('api::article.article', params);

    expect(result).toBe('http://preview.example.com');
    expect(mockConfig.isConfigured).toHaveBeenCalled();
    expect(mockConfig.getPreviewHandler).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith('api::article.article', params);
  });
});
