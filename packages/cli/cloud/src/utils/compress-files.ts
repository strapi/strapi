import * as fs from 'fs';
import * as tar from 'tar';
import * as path from 'path';
import { minimatch } from 'minimatch';

const IGNORED_PATTERNS = [
  '**/.git/**',
  '**/node_modules/**',
  '**/build/**',
  '**/dist/**',
  '**/.cache/**',
  '**/.circleci/**',
  '**/.github/**',
  '**/.gitignore',
  '**/.gitkeep',
  '**/.gitlab-ci.yml',
  '**/.idea/**',
  '**/.vscode/**',
];

const getFiles = (
  dirPath: string,
  ignorePatterns: string[] = [],
  arrayOfFiles: string[] = []
): string[] => {
  const entries = fs.readdirSync(dirPath);
  entries.forEach((entry) => {
    const entryPath = path.resolve(dirPath, entry);
    const isIgnored = isIgnoredFile(dirPath, entry, ignorePatterns);
    if (isIgnored) {
      return;
    }
    if (fs.statSync(entryPath).isDirectory()) {
      getFiles(entryPath, ignorePatterns, arrayOfFiles);
    } else {
      arrayOfFiles.push(entryPath);
    }
  });
  return arrayOfFiles;
};

const isIgnoredFile = (folderPath: string, file: string, ignorePatterns: string[]): boolean => {
  ignorePatterns.push(...IGNORED_PATTERNS);
  const relativeFilePath = path.join(folderPath, file);
  let isIgnored = false;
  for (const pattern of ignorePatterns) {
    if (pattern.startsWith('!')) {
      if (minimatch(relativeFilePath, pattern.slice(1), { matchBase: true, dot: true })) {
        return false;
      }
    } else if (minimatch(relativeFilePath, pattern, { matchBase: true, dot: true })) {
      if (path.basename(file) !== '.gitkeep') {
        isIgnored = true;
      }
    }
  }
  return isIgnored;
};

const readGitignore = (folderPath: string): string[] => {
  const gitignorePath = path.resolve(folderPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  return gitignoreContent
    .split('\n')
    .filter((line) => Boolean(line.trim()) && !line.startsWith('#'));
};

const compressFilesToTar = async (
  storagePath: string,
  folderToCompress: string,
  filename: string
): Promise<void> => {
  const ignorePatterns = readGitignore(folderToCompress);
  const filesToCompress = getFiles(folderToCompress, ignorePatterns);

  return tar.c(
    {
      gzip: true,
      file: path.resolve(storagePath, filename),
      cwd: storagePath,
    },
    filesToCompress
  );
};

export { compressFilesToTar, isIgnoredFile };
