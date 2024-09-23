import { Logger, loggerFactory } from '../logger';

jest.mock('chalk', () => ({
  cyan: jest.fn((text) => text),
  red: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
}));

describe('Logger', () => {
  const mockDate = new Date('2023-01-01');
  beforeAll(() => {
    jest.useFakeTimers();

    jest.setSystemTime(mockDate);
  });

  beforeEach(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const logger = loggerFactory();
      expect(logger.isDebug).toBe(false);
      expect(logger.isSilent).toBe(false);
      expect(logger.errors).toBe(0);
      expect(logger.warnings).toBe(0);
    });

    it('should initialize with provided options', () => {
      const customLogger = loggerFactory({ debug: true, silent: true });
      expect(customLogger.isDebug).toBe(true);
      expect(customLogger.isSilent).toBe(true);
    });
  });

  describe('Setters', () => {
    const logger = loggerFactory();
    it('should set isDebug', () => {
      logger.setDebug(true);
      expect(logger.isDebug).toBe(true);
    });
    it('should set isSilent', () => {
      logger.setSilent(true);
      expect(logger.isSilent).toBe(true);
    });
  });

  describe('Debug messages', () => {
    const logger = loggerFactory({ debug: true });

    it('should log debug messages when not silent and debug is true', () => {
      logger.debug('Test debug message');
      expect(console.log).toHaveBeenCalledWith(
        `[DEBUG]\t[${mockDate.toISOString()}]`,
        'Test debug message'
      );
    });

    it('should not log debug messages when silent', () => {
      logger.setSilent(true);
      logger.debug('Test debug message');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('Error messages', () => {
    const logger = loggerFactory();

    it('should log error messages when not silent', () => {
      logger.error('Test error message');
      expect(console.error).toHaveBeenCalledWith(
        `[ERROR]\t[${mockDate.toISOString()}]`,
        'Test error message'
      );
      expect(logger.errors).toBe(1);
    });

    it('should not log error messages when silent', () => {
      logger.setSilent(true);
      logger.error('Test error message');
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Info messages', () => {
    const logger = loggerFactory();

    it('should log info messages when not silent', () => {
      logger.info('Test info message');
      expect(console.info).toHaveBeenCalledWith(
        `[INFO]\t[${mockDate.toISOString()}]`,
        'Test info message'
      );
    });

    it('should not log info messages when silent', () => {
      logger.setSilent(true);
      logger.info('Test info message');
      expect(console.info).not.toHaveBeenCalled();
    });
  });

  describe('Raw mode', () => {
    const logger = loggerFactory();

    it('should log raw messages when not silent', () => {
      logger.raw('Test raw message');
      expect(console.log).toHaveBeenCalledWith('Test raw message');
    });

    it('should not log raw messages when silent', () => {
      logger.setSilent(true);
      logger.raw('Test raw message');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('Warnings', () => {
    const logger = loggerFactory();
    it('should log warning messages when not silent', () => {
      logger.warn('Test warning message');
      expect(console.warn).toHaveBeenCalledWith(
        `[WARN]\t[${mockDate.toISOString()}]`,
        'Test warning message'
      );
      expect(logger.warnings).toBe(1);
    });

    it('should not log warning messages when silent', () => {
      logger.setSilent(true);
      logger.warn('Test warning message');
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('loggerFactory', () => {
    it('should create a new Logger instance', () => {
      const customLogger = loggerFactory({ debug: true });
      expect(customLogger).toBeInstanceOf(Logger);
      expect(customLogger.isDebug).toBe(true);
    });
  });
});
