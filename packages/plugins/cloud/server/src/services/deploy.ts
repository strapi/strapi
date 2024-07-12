// TODO Migrate to fs-extra
import * as fs from 'fs';
import fsAsync from 'fs/promises';
import fse from 'fs-extra';
import { minimatch } from 'minimatch';
import * as crypto from 'node:crypto';
import os from 'os';
import * as path from 'path';
import pkgUp from 'pkg-up';
import * as tar from 'tar';
import axios from 'axios';

type PackageJson = {
  name: string;
  strapi?: {
    uuid: string;
  };
};

const BUILD_ENGINE_TOKEN = '45641f15-c7fd-408d-802c-7357723079a3';
const APP_FOLDER_NAME = 'com.strapi.cli';
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

const strapiPath = process.cwd();
// Determine storage path based on the operating system
async function getTmpStoragePath() {
  const storagePath = path.join(os.tmpdir(), APP_FOLDER_NAME);
  await fse.ensureDir(storagePath);
  return storagePath;
}

async function upload(projectName: string, filePath: string) {
  return axios.post(
    `https://builds.staging.cloud.strapi.team/builds-from-archive`,
    {
      archive: fse.createReadStream(filePath),
      project_internal_name: projectName,
      tracking_uuid: '1234',
      node_version: 20,
      base_directory: '',
      build_finished_webhook_url:
        'https://platform-api-jimi.tunnel.cloud.strapi.team/builds/webhook',
      region: 'NYC',
    },
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${BUILD_ENGINE_TOKEN}`,
      },
    }
  );
}
/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 */
const loadPkg = async (): Promise<PackageJson> => {
  const pkgPath = await pkgUp({ cwd: strapiPath });

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fsAsync.readFile(pkgPath);

  const pkg = JSON.parse(buffer.toString());

  return pkg;
};

const getFiles = (
  dirPath: string,
  ignorePatterns: string[] = [],
  arrayOfFiles: string[] = [],
  subfolder: string = ''
): string[] => {
  const entries = fs.readdirSync(path.join(dirPath, subfolder));
  entries.forEach((entry) => {
    const entryPathFromRoot = path.join(subfolder, entry);
    const entryPath = path.relative(dirPath, entryPathFromRoot);
    const isIgnored = isIgnoredFile(dirPath, entryPathFromRoot, ignorePatterns);
    if (isIgnored) {
      return;
    }
    if (fs.statSync(entryPath).isDirectory()) {
      getFiles(dirPath, ignorePatterns, arrayOfFiles, entryPathFromRoot);
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
    .split(/\r?\n/)
    .filter((line) => Boolean(line.trim()) && !line.startsWith('#'));
};

const compressFilesToTar = async (): Promise<string> => {
  const packageJson = await loadPkg();
  const storagePath = await getTmpStoragePath();
  const ignorePatterns = readGitignore(strapiPath);
  const filesToCompress = getFiles(strapiPath, ignorePatterns);
  const hashname = crypto.createHash('sha512').update(packageJson.name).digest('hex');
  const compressedFilename = `${hashname}.tar.gz`;
  await tar.c(
    {
      gzip: true,
      file: path.resolve(storagePath, compressedFilename),
    },
    filesToCompress
  );

  return `${storagePath}/${compressedFilename}`;
};

export { compressFilesToTar, isIgnoredFile, upload };
