import fse from 'fs-extra';
import path from 'path';
import type { ProjectInfo } from './cli-api';

export const LOCAL_SAVE_FILENAME = '.strapi-cloud.json';

export type LocalSave = {
  project?: Omit<ProjectInfo, 'id'>;
};

export async function addEnvironment(
  targetEnvironment: string | undefined,
  { directoryPath }: { directoryPath?: string } = {}
) {
  const alreadyInFileData = await retrieve({ directoryPath });
  if (!alreadyInFileData || !alreadyInFileData.project) {
    throw new Error('No valid configuration found in the local configuration file.');
  }
  const dataToSave: LocalSave = {
    ...alreadyInFileData,
    project: {
      ...alreadyInFileData.project,
      targetEnvironment,
    },
  };
  await save(dataToSave, { directoryPath });
}

export async function save(data: LocalSave, { directoryPath }: { directoryPath?: string } = {}) {
  const pathToFile = path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);
  await fse.ensureDir(path.dirname(pathToFile));
  await fse.writeJson(pathToFile, data, { encoding: 'utf8' });
}

export async function retrieve({
  directoryPath,
}: { directoryPath?: string } = {}): Promise<LocalSave> {
  const pathToFile = path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);
  const pathExists = await fse.pathExists(pathToFile);
  if (!pathExists) {
    return {};
  }

  return fse.readJSON(pathToFile, { encoding: 'utf8' });
}
