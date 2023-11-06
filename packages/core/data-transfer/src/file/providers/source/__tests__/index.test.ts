import { Readable } from 'stream';
import type { ILocalFileSourceProviderOptions } from '..';

import { createLocalFileSourceProvider } from '..';
import { isFilePathInDirname, isPathEquivalent, unknownPathToPosix } from '../utils';

describe('File source provider', () => {
  test('returns assets stream', () => {
    const options: ILocalFileSourceProviderOptions = {
      file: {
        path: './test-file',
      },
      compression: {
        enabled: false,
      },
      encryption: {
        enabled: false,
      },
    };
    const provider = createLocalFileSourceProvider(options);
    const stream = provider.createAssetsReadStream();

    expect(stream instanceof Readable).toBeTruthy();
  });

  describe('utils', () => {
    const unknownConversionCases = [
      ['some/path/on/posix', 'some/path/on/posix'],
      ['some/path/on/posix/', 'some/path/on/posix/'],
      ['some/path/on/posix.jpg', 'some/path/on/posix.jpg'],
      ['file.jpg', 'file.jpg'],
      ['noextension', 'noextension'],
      ['some\\windows\\filename.jpg', 'some/windows/filename.jpg'],
      ['some\\windows\\noendingslash', 'some/windows/noendingslash'],
      ['some\\windows\\endingslash\\', 'some/windows/endingslash/'],
      ['some\\windows/mixed', 'some\\windows/mixed'], // improper usage resulting in invalid path if provided mixed windows path, but test expected behaviour
    ];
    test.each(unknownConversionCases)('unknownPathToPosix: %p -> %p', (input, expected) => {
      expect(unknownPathToPosix(input)).toEqual(expected);
    });

    const isFilePathInDirnameCases: [string, string, boolean][] = [
      // posix paths
      ['some/path/on/posix', 'some/path/on/posix/file.jpg', true],
      ['some/path/on/posix/', 'some/path/on/posix/file.jpg', true],
      ['./some/path/on/posix', 'some/path/on/posix/file.jpg', true],
      ['some/path/on/posix/', './some/path/on/posix/file.jpg', true],
      ['some/path/on/posix/', 'some/path/on/posix/', false], // invalid; second should include a filename
      ['some/path/on/posix', 'some/path/on/posix', false], // 'posix' in second should be interpreted as a filename
      ['', './file.jpg', true],
      ['./', './file.jpg', true],
      ['noextension', './noextension/file.jpg', true],
      ['./noextension', './noextension/file.jpg', true],
      ['./noextension', 'noextension/file.jpg', true],
      ['noextension', 'noextension/noextension', true],
      // win32 paths
      ['some/path/on/win32', 'some\\path\\on\\win32\\file.jpg', true],
      ['some/path/on/win32/', 'some\\path\\on\\win32\\file.jpg', true],
      ['some/path/on/win32/', 'some\\path\\on\\win32\\', false], // invalid; second should include a filename
      ['some/path/on/win32', 'some\\path\\on\\win32', false], // 'win32' in second should be interpreted as a filename
      ['', '.\\file.jpg', true],
      ['./', '.\\file.jpg', true],
      ['noextension', '.\\noextension\\file.jpg', true],
      ['./noextension', '.\\noextension\\file.jpg', true],
      ['./noextension', 'noextension\\file.jpg', true],
      ['noextension', 'noextension\\noextension', true],
      // no path structure
      ['', 'file.jpg', true],
      ['noextension', 'noextension', false], // second case is a file
    ];
    test.each(isFilePathInDirnameCases)(
      'isFilePathInDirname: %p : %p -> %p',
      (inputA, inputB, expected) => {
        expect(isFilePathInDirname(inputA, inputB)).toEqual(expected);
      }
    );

    const isPathEquivalentCases: [string, string, boolean][] = [
      // POSITIVES
      // root level
      ['file.jpg', 'file.jpg', true],
      ['file.jpg', '.\\file.jpg', true],
      ['file.jpg', './file.jpg', true],
      // cwd root level (posix)
      ['./file.jpg', 'file.jpg', true],
      ['./file.jpg', './file.jpg', true],
      ['./file.jpg', '.\\file.jpg', true],
      // cwd root level (win32)
      ['.\\file.jpg', 'file.jpg', true],
      ['.\\file.jpg', './file.jpg', true],
      ['.\\file.jpg', '.\\file.jpg', true],
      // directory with file (posix)
      ['one/two/file.jpg', 'one/two/file.jpg', true],
      ['one/two/file.jpg', './one/two/file.jpg', true],
      ['one/two/file.jpg', 'one\\two\\file.jpg', true],
      ['one/two/file.jpg', '.\\one\\two\\file.jpg', true],
      // cwd with file (posix)
      ['./one/two/file.jpg', 'one/two/file.jpg', true],
      ['./one/two/file.jpg', './one/two/file.jpg', true],
      ['./one/two/file.jpg', 'one\\two\\file.jpg', true],
      ['./one/two/file.jpg', '.\\one\\two\\file.jpg', true],
      // directory with file (win32)
      ['one\\two\\file.jpg', 'one/two/file.jpg', true],
      ['one\\two\\file.jpg', './one/two/file.jpg', true],
      ['one\\two\\file.jpg', '.\\one\\two\\file.jpg', true],
      ['one\\two\\file.jpg', 'one\\two\\file.jpg', true],
      // cwd with file (win32)
      ['.\\one\\two\\file.jpg', 'one/two/file.jpg', true],
      ['.\\one\\two\\file.jpg', './one/two/file.jpg', true],
      ['.\\one\\two\\file.jpg', '.\\one\\two\\file.jpg', true],
      ['.\\one\\two\\file.jpg', 'one\\two\\file.jpg', true],
      // special characters
      [".\\one\\two\\fi ' ^&*() le.jpg", "one/two/fi ' ^&*() le.jpg", true], // valid characters on win32
      ['test/backslash\\file.jpg', 'test/backslash\\file.jpg', true], // backlash is valid on posix but not win32

      // NEGATIVES
      ['file.jpg', 'one/file.jpg', false],
      ['file.jpg', 'one\\file.jpg', false],
      ['file.jpg', '/file.jpg', false],
      ['file.jpg', '\\file.jpg', false],
      ['one/file.jpg', '\\one\\file.jpg', false],
      ['one/file.jpg', '/one/file.jpg', false],
      ['one/file.jpg', 'file.jpg', false],
      ['test/mixedslash\\file.jpg', 'test/mixedslash/file.jpg', false], // windows path with mixed path separators should fail
    ];
    test.each(isPathEquivalentCases)(
      'isPathEquivalent: %p : %p -> %p',
      (inputA, inputB, expected) => {
        expect(isPathEquivalent(inputA, inputB)).toEqual(expected);
      }
    );
  });
});
