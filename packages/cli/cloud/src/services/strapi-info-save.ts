import fse from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import type { ProjectInfo } from './cli-api';

export const LOCAL_SAVE_FILENAME = '.strapi-cloud.json';

export type LocalSave = {
  project?: Omit<ProjectInfo, 'id'>;
};

// Utility type for making all properties optional recursively
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type LocalPatch = {
  project?: DeepPartial<Omit<ProjectInfo, 'id'>>;
};

const getFilePath = (directoryPath?: string): string =>
  path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);

export async function save(data: LocalSave, { directoryPath }: { directoryPath?: string } = {}) {
  const pathToFile = getFilePath(directoryPath);
  // Ensure the directory exists and creates it if not
  await fse.ensureDir(path.dirname(pathToFile));
  await fse.writeJson(pathToFile, data, { encoding: 'utf8' });
}

export async function retrieve({
  directoryPath,
}: { directoryPath?: string } = {}): Promise<LocalSave> {
  const pathToFile = getFilePath(directoryPath);
  const pathExists = await fse.pathExists(pathToFile);
  if (!pathExists) {
    return {};
  }
  return fse.readJSON(pathToFile, { encoding: 'utf8' });
}

export async function patch(
  patchData: LocalPatch,
  { directoryPath }: { directoryPath?: string } = {}
) {
  const pathToFile = getFilePath(directoryPath);
  const existingData = await retrieve({ directoryPath });
  if (!existingData) {
    throw new Error('No configuration data found to patch.');
  }
  const newData = merge(existingData, patchData);
  await fse.writeJson(pathToFile, newData, { encoding: 'utf8' });
}

export async function deleteConfig({ directoryPath }: { directoryPath?: string } = {}) {
  const pathToFile = getFilePath(directoryPath);
  const pathExists = await fse.pathExists(pathToFile);
  if (pathExists) {
    await fse.remove(pathToFile);
  }
}
