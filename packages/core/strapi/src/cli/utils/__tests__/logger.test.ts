import { type Logger, createLogger } from '@strapi/logger';
import { formatDiagnostic } from '../data-transfer';

jest.mock('@strapi/logger', () => {
  const actualWinston = jest.requireActual('winston');
  return {
    ...actualWinston,
    createLogger: jest.fn(),
    configs: {
      createOutputFileConfiguration: jest.fn(),
    },
  };
});

// Mock console methods to avoid cluttering test output
const consoleMock = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  info: jest.spyOn(console, 'info').mockImplementation(() => {}),
};

describe('logger', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock logger with jest.fn() methods
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock createLogger to return the mock logger
    (createLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    // Clear console mocks after each test
    consoleMock.error.mockClear();
    consoleMock.warn.mockClear();
    consoleMock.info.mockClear();
  });

  describe('formatDiagnostic', () => {
    it('only creates a single logger', () => {
      const diagnosticReporter = formatDiagnostic('export');

      // Use the diagnostic reporter to log different levels of messages
      diagnosticReporter({
        kind: 'error',
        details: {
          message: 'Test error',
          createdAt: new Date(),
          name: '',
          severity: 'error',
          error: new Error(),
        },
      });
      diagnosticReporter({
        kind: 'warning',
        details: {
          message: 'Test warning',
          createdAt: new Date(),
        },
      });
      diagnosticReporter({
        kind: 'info',
        details: {
          message: 'Test info',
          createdAt: new Date(),
        },
      });

      // Verify createLogger is called only once
      expect(createLogger).toHaveBeenCalledTimes(1);

      // Verify the mock logger received the logs
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Test warning'));
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Test info'));
    });
  });
});
