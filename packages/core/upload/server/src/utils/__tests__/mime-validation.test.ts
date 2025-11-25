import { readFile } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import {
  detectMimeType,
  isMimeTypeAllowed,
  validateFile,
  validateFiles,
  enforceUploadSecurity,
  type SecurityConfig,
} from '../mime-validation';

jest.mock('node:fs/promises');

jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

const mockReadFile = jest.mocked(readFile);
const mockFileTypeFromBuffer = jest.mocked(fileTypeFromBuffer);

const mockStrapi = {
  log: {
    warn: jest.fn(),
    error: jest.fn(),
  },
  config: {
    get: jest.fn(),
  },
} as any;

describe('mime-validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('detectMimeType', () => {
    it('should throw error when file reading fails', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(detectMimeType({ path: '/nonexistent/file.jpg' })).rejects.toThrow(
        'Failed to read file: File not found'
      );
    });

    it('should return undefined when MIME type detection returns no result', async () => {
      const mockBuffer = Buffer.from('unknown data');
      mockReadFile.mockResolvedValue(mockBuffer);
      mockFileTypeFromBuffer.mockResolvedValue(undefined);

      const result = await detectMimeType({ path: '/path/to/unknown.file' });

      expect(result).toBeUndefined();
    });

    it('should throw error when MIME type detection fails', async () => {
      const mockBuffer = Buffer.from('corrupted data');
      mockReadFile.mockResolvedValue(mockBuffer);
      mockFileTypeFromBuffer.mockRejectedValue(new Error('Invalid file format'));

      await expect(detectMimeType({ path: '/path/to/corrupted.file' })).rejects.toThrow(
        'Failed to detect MIME type: Invalid file format'
      );
    });
  });

  describe('isMimeTypeAllowed', () => {
    it('should return false for empty MIME type', () => {
      const config: SecurityConfig = { allowedTypes: ['image/*'] };

      expect(isMimeTypeAllowed('', config)).toBe(false);
      expect(isMimeTypeAllowed(null as any, config)).toBe(false);
      expect(isMimeTypeAllowed(undefined as any, config)).toBe(false);
    });

    it('should allow MIME type when no restrictions are configured', () => {
      const config: SecurityConfig = {};

      expect(isMimeTypeAllowed('image/jpeg', config)).toBe(true);
      expect(isMimeTypeAllowed('application/pdf', config)).toBe(true);
    });

    it('should deny MIME type when in denied list', () => {
      const config: SecurityConfig = {
        deniedTypes: ['application/x-executable', 'text/x-shellscript'],
      };

      expect(isMimeTypeAllowed('application/x-executable', config)).toBe(false);
      expect(isMimeTypeAllowed('text/x-shellscript', config)).toBe(false);
      expect(isMimeTypeAllowed('image/jpeg', config)).toBe(true);
    });

    it('should allow only MIME types in allowed list', () => {
      const config: SecurityConfig = {
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      };

      expect(isMimeTypeAllowed('image/jpeg', config)).toBe(true);
      expect(isMimeTypeAllowed('image/png', config)).toBe(true);
      expect(isMimeTypeAllowed('application/pdf', config)).toBe(true);
      expect(isMimeTypeAllowed('text/plain', config)).toBe(false);
    });

    it('should handle exact type matching', () => {
      const config: SecurityConfig = {
        allowedTypes: ['image/gif', 'video/mp4'],
        deniedTypes: ['video/quicktime'],
      };

      expect(isMimeTypeAllowed('image/gif', config)).toBe(true);
      expect(isMimeTypeAllowed('video/mp4', config)).toBe(true);
      expect(isMimeTypeAllowed('video/quicktime', config)).toBe(false);
      expect(isMimeTypeAllowed('audio/mp3', config)).toBe(false);
    });

    it('should handle wildcard patterns correctly', () => {
      const config: SecurityConfig = {
        allowedTypes: ['image/*', 'video/*'],
        deniedTypes: ['video/quicktime'],
      };

      expect(isMimeTypeAllowed('image/gif', config)).toBe(true);
      expect(isMimeTypeAllowed('video/mp4', config)).toBe(true);
      expect(isMimeTypeAllowed('video/quicktime', config)).toBe(false);
      expect(isMimeTypeAllowed('audio/mp3', config)).toBe(false);
    });

    it('should deny list takes precedence over allow list', () => {
      const config: SecurityConfig = {
        allowedTypes: ['image/*'],
        deniedTypes: ['image/svg+xml'],
      };

      expect(isMimeTypeAllowed('image/jpeg', config)).toBe(true);
      expect(isMimeTypeAllowed('image/svg+xml', config)).toBe(false);
    });

    it('should handle case insensitive matching', () => {
      const config: SecurityConfig = {
        allowedTypes: ['image/jpeg', 'application/pdf'],
      };

      expect(isMimeTypeAllowed('image/jpeg', config)).toBe(true);
      expect(isMimeTypeAllowed('APPLICATION/pdf', config)).toBe(true);
    });

    it('should handle hybrid allowlist and denylist correctly', () => {
      const config: SecurityConfig = {
        allowedTypes: ['image/*', 'application/*'],
        deniedTypes: ['application/x-executable'],
      };

      // PDF should be allowed (matches application/* but not in denied list)
      expect(isMimeTypeAllowed('application/pdf', config)).toBe(true);

      // Images should be allowed (matches image/*)
      expect(isMimeTypeAllowed('image/jpeg', config)).toBe(true);

      // Executables should be denied (in denied list, despite matching application/*)
      expect(isMimeTypeAllowed('application/x-executable', config)).toBe(false);

      // Text files should be denied (not in allowed list)
      expect(isMimeTypeAllowed('text/plain', config)).toBe(false);
    });
  });

  describe('validateFile', () => {
    const mockFile = {
      name: 'test.jpg',
      path: '/tmp/test.jpg',
      size: 100000,
      type: 'image/jpeg',
    };

    beforeEach(() => {
      mockStrapi.config.get.mockReturnValue({});
    });

    it('should return valid when no security config is provided', async () => {
      const config: SecurityConfig = {};

      const result = await validateFile(mockFile, config, mockStrapi);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate MIME type successfully', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('fake image'));
      mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

      const config: SecurityConfig = {
        allowedTypes: ['image/jpeg'],
      };

      const result = await validateFile(mockFile, config, mockStrapi);

      expect(result.isValid).toBe(true);
    });

    it('should reject disallowed MIME type', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('fake image'));
      mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

      const config: SecurityConfig = {
        allowedTypes: ['application/pdf'],
      };

      const result = await validateFile(mockFile, config, mockStrapi);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('MIME_TYPE_NOT_ALLOWED');
      expect(result.error?.message).toContain('image/jpeg');
    });

    it('should handle files without path', async () => {
      const fileWithoutPath = { ...mockFile, path: undefined };
      const config: SecurityConfig = {
        allowedTypes: ['image/jpeg'],
      };

      const result = await validateFile(fileWithoutPath, config, mockStrapi);

      expect(result.isValid).toBe(true);
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should extract file info from various file object formats', async () => {
      const fileVariants = [
        { originalname: 'test.jpg', mimetype: 'image/jpeg', size: 100000 },
        { filename: 'test.jpg', mimeType: 'image/jpeg', length: 100000 },
        { originalFilename: 'test.jpg', mime: 'image/jpeg', size: 100000 },
      ];

      const config: SecurityConfig = {
        allowedTypes: ['image/jpeg'],
      };

      for (const file of fileVariants) {
        const result = await validateFile(file, config, mockStrapi);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('validateFiles', () => {
    const mockFile1 = {
      name: 'test1.jpg',
      path: '/tmp/test1.jpg',
      size: 100000,
      type: 'image/jpeg',
    };

    const mockFile2 = {
      name: 'test2.pdf',
      path: '/tmp/test2.pdf',
      size: 200000,
      type: 'application/pdf',
    };

    beforeEach(() => {
      mockStrapi.config.get.mockReturnValue({
        allowedTypes: ['image/jpeg', 'application/pdf'],
      });
    });

    it('should handle single file', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('fake image'));
      mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

      const results = await validateFiles(mockFile1, mockStrapi);

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(true);
    });

    it('should handle array of files', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('fake data'));
      mockFileTypeFromBuffer
        .mockResolvedValueOnce({ mime: 'image/jpeg', ext: 'jpg' })
        .mockResolvedValueOnce({ mime: 'application/pdf', ext: 'pdf' });

      const results = await validateFiles([mockFile1, mockFile2], mockStrapi);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });

    it('should return empty array for empty input', async () => {
      const results = await validateFiles([], mockStrapi);
      expect(results).toHaveLength(0);
    });

    it('should handle validation errors gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('Unexpected error'));
      mockStrapi.config.get.mockReturnValue({
        allowedTypes: ['application/pdf'],
      });

      const brokenFile = { ...mockFile1, path: '/invalid/path' };
      const results = await validateFiles([brokenFile], mockStrapi);

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].error?.code).toBe('MIME_TYPE_NOT_ALLOWED');
    });

    it('should warn when no security config is found', async () => {
      mockStrapi.config.get.mockReturnValue({});

      const results = await validateFiles([mockFile1], mockStrapi);

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(true);
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('No upload security configuration found')
      );
    });

    it('throws error if allowedTypes is not an array', async () => {
      mockStrapi.config.get.mockReturnValue({ allowedTypes: 'not-an-array' });
      await expect(validateFiles(mockFile1, mockStrapi as any)).rejects.toThrow(
        'Invalid configuration: allowedTypes must be an array of strings.'
      );
    });

    it('throws error if allowedTypes contains non-string items', async () => {
      mockStrapi.config.get.mockReturnValue({ allowedTypes: ['image/png', 123] });
      await expect(validateFiles(mockFile1, mockStrapi as any)).rejects.toThrow(
        'Invalid configuration: allowedTypes must be an array of strings.'
      );
    });

    it('throws error if deniedTypes is not an array', async () => {
      mockStrapi.config.get.mockReturnValue({ deniedTypes: 'not-an-array' });
      await expect(validateFiles(mockFile1, mockStrapi as any)).rejects.toThrow(
        'Invalid configuration: deniedTypes must be an array of strings.'
      );
    });

    it('throws error if deniedTypes contains non-string items', async () => {
      mockStrapi.config.get.mockReturnValue({ deniedTypes: ['image/png', 123] });
      await expect(validateFiles(mockFile1, mockStrapi as any)).rejects.toThrow(
        'Invalid configuration: deniedTypes must be an array of strings.'
      );
    });

    it('does not throw if config is valid', async () => {
      mockStrapi.config.get.mockReturnValue({
        allowedTypes: ['image/png'],
        deniedTypes: ['image/gif'],
      });
      await expect(validateFiles([], mockStrapi as any)).resolves.toBeInstanceOf(Array);
    });
  });

  describe('enforceUploadSecurity', () => {
    const mockFile = {
      name: 'test.jpg',
      path: '/tmp/test.jpg',
      size: 100000,
      type: 'image/jpeg',
    };

    beforeEach(() => {
      mockStrapi.config.get.mockReturnValue({
        allowedTypes: ['image/jpeg'],
      });
      mockReadFile.mockResolvedValue(Buffer.from('fake image'));
      mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });
    });

    it('should return valid files when security check passes', async () => {
      const result = await enforceUploadSecurity([mockFile], mockStrapi);

      expect(result.validFiles).toHaveLength(1);
      expect(result.validFileNames).toEqual(['test.jpg']);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for disallowed MIME type', async () => {
      mockStrapi.config.get.mockReturnValue({
        allowedTypes: ['application/pdf'],
      });

      const result = await enforceUploadSecurity([mockFile], mockStrapi);

      expect(result.validFiles).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.code).toBe('MIME_TYPE_NOT_ALLOWED');
    });

    it('should handle single file input', async () => {
      const result = await enforceUploadSecurity(mockFile, mockStrapi);

      expect(result.validFiles).toHaveLength(1);
      expect(result.validFileNames).toEqual(['test.jpg']);
      expect(result.errors).toHaveLength(0);
    });

    it('should include file index in error details', async () => {
      const files = [
        { ...mockFile, name: 'valid.jpg', type: 'image/jpeg' },
        { ...mockFile, name: 'invalid.exe', type: 'application/x-executable' },
      ];

      mockStrapi.config.get.mockReturnValue({
        allowedTypes: ['image/jpeg'],
      });

      mockFileTypeFromBuffer
        .mockResolvedValueOnce({ mime: 'image/jpeg', ext: 'jpg' })
        .mockResolvedValueOnce({ mime: 'application/x-tar', ext: 'tar' });

      const result = await enforceUploadSecurity(files, mockStrapi);

      expect(result.validFiles).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].originalIndex).toBe(1);
      expect(result.errors[0].error.code).toBe('MIME_TYPE_NOT_ALLOWED');
    });
  });
});
