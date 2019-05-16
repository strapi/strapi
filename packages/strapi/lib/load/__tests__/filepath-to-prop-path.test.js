const filePathToPropPath = require('../filepath-to-prop-path');

const commonCases = [
  ['./config/test.js', ['config', 'test']],
  ['./config/test.json', ['config', 'test']],
  ['./config/test.settings.js', ['config', 'test']],
  ['./config/test.settings.json', ['config', 'test']],
  ['config/test.settings.json', ['config', 'test']],
];

describe('filePathToPropPath', () => {
  test.each(commonCases)('File %s becomes %p', (input, expected) => {
    expect(filePathToPropPath(input)).toEqual(expected);
  });


  // uses dots to create path
  test('Uses dots for key separation', () => {
    expect(filePathToPropPath('./config/file.key.js')).toEqual([
      'config',
      'file',
      'key',
    ]);

    expect(filePathToPropPath('./config/file.key.json')).toEqual([
      'config',
      'file',
      'key',
    ]);
  });

  // removes the last prop of the path
  test('Disable file name key', () => {
    expect(filePathToPropPath('./config/test.js', false)).toEqual(['config']);
    expect(filePathToPropPath('./config/test.key.js', false)).toEqual([
      'config',
      'test',
    ]);
  });
});
