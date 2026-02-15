import { describe, it, expect } from 'vitest';
import { filePathToPropPath } from '../filepath-to-prop-path';

const commonCases: [string, string[]][] = [
  ['./config/test.js', ['config', 'test']],
  ['./config/test.json', ['config', 'test']],
  ['./config/test.settings.js', ['config', 'test']],
  ['./config/test.settings.json', ['config', 'test']],
  ['config/test.settings.json', ['config', 'test']],
];

describe.concurrent('filePathToPropPath', () => {
  it.each<[string, string[]]>(commonCases)('File %s becomes %p', (input, expected) => {
    expect(filePathToPropPath(input)).toEqual(expected);
  });

  // uses dots to create path
  it('Uses dots for key separation', () => {
    expect(filePathToPropPath('./config/file.key.js')).toEqual(['config', 'file', 'key']);

    expect(filePathToPropPath('./config/file.key.json')).toEqual(['config', 'file', 'key']);
  });

  // removes the last prop of the path
  it('Disable file name key', () => {
    expect(filePathToPropPath('./config/test.js', false)).toEqual(['config']);
    expect(filePathToPropPath('./config/test.key.js', false)).toEqual(['config', 'test']);
  });

  describe.concurrent('Separators', () => {
    it('Win32 Separators', () => {
      expect(filePathToPropPath('config\\test.js')).toEqual(['config', 'test']);
      expect(filePathToPropPath('.\\config\\test.js')).toEqual(['config', 'test']);
    });

    it('Posix Separators', () => {
      expect(filePathToPropPath('config/test.js')).toEqual(['config', 'test']);
      expect(filePathToPropPath('./config/test.js')).toEqual(['config', 'test']);
    });

    it('Mixed Separators (win32 + posix)', () => {
      expect(filePathToPropPath('src\\config/test.js')).toEqual(['src', 'config', 'test']);
      expect(filePathToPropPath('.\\config/test.js')).toEqual(['config', 'test']);
    });
  });
});
