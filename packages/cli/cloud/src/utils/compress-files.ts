import * as fse from 'fs-extra';
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

const getFiles = async (
  dirPath: string,
  ignorePatterns: string[] = [],
  subfolder: string = ''
): Promise<string[]> => {
  const arrayOfFiles: string[] = [];
  const entries = await fse.readdir(path.join(dirPath, subfolder));

  for (const entry of entries) {
    const entryPathFromRoot = path.join(subfolder, entry);
    const entryPath = path.relative(dirPath, entryPathFromRoot);
    const isIgnored = isIgnoredFile(dirPath, entryPathFromRoot, ignorePatterns);

    if (!isIgnored) {
      if (fse.statSync(entryPath).isDirectory()) {
        const subFiles = await getFiles(dirPath, ignorePatterns, entryPathFromRoot);
        arrayOfFiles.push(...subFiles);
      } else {
        arrayOfFiles.push(entryPath);
      }
    }
  }
  return arrayOfFiles;
};

const readGitignore = async (folderPath: string): Promise<string[]> => {
  const gitignorePath = path.resolve(folderPath, '.gitignore');
  const pathExist = await fse.pathExists(gitignorePath);

  if (!pathExist) return [];

  const gitignoreContent = await fse.readFile(gitignorePath, 'utf8');

  return gitignoreContent
    .split(/\r?\n/)
    .filter((line) => Boolean(line.trim()) && !line.startsWith('#'));
};

const compressFilesToTar = async (
  storagePath: string,
  folderToCompress: string,
  filename: string
): Promise<void> => {
  const ignorePatterns = await readGitignore(folderToCompress);
  const filesToCompress = await getFiles(folderToCompress, ignorePatterns);

  return tar.c(
    {
      gzip: true,
      file: path.resolve(storagePath, filename),
    },
    filesToCompress
  );
};

export { compressFilesToTar, isIgnoredFile };
