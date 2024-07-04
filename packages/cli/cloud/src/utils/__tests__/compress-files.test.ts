import path from 'path';
import os from 'os';
import { isIgnoredFile } from '../compress-files';

describe('isIgnoredFile', () => {
  const folderPath = os.tmpdir(); // We are using the system's directory path for simulating a real path
  it('should correctly handle various ignore patterns', () => {
    const allFiles = [
      path.join(folderPath, 'file1.txt'),
      path.join(folderPath, 'file2.txt'),
      path.join(folderPath, 'node_modules', 'file3.js'),
      path.join(folderPath, '.git', 'file4.js'),
      path.join(folderPath, 'dist', 'file5.js'),
      path.join(folderPath, 'public', 'uploads', '.gitkeep'),
      path.join(folderPath, 'src', 'secret', 'file6.js'),
      path.join(folderPath, 'src', 'secret', 'keep.me'),
      path.join(folderPath, 'test', 'file7.test.ts'),
    ];
    const ignorePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '!public/uploads/.gitkeep',
      '!**/*.test.ts',
      '**/src/secret/**',
      '!**/src/secret/keep.me',
    ];
    const result = allFiles.filter((file) => !isIgnoredFile(folderPath, file, ignorePatterns));
    expect(result).toEqual([
      path.join(folderPath, 'file1.txt'),
      path.join(folderPath, 'file2.txt'),
      path.join(folderPath, 'public', 'uploads', '.gitkeep'),
      path.join(folderPath, 'src', 'secret', 'keep.me'),
      path.join(folderPath, 'test', 'file7.test.ts'),
    ]);
  });
});
