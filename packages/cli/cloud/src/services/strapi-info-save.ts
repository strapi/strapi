import fse from 'fs-extra';
import path from 'path';
import type { ProjectInfos } from './cli-api';

export const LOCAL_SAVE_FILENAME = '.strapi-cloud.json';

export type LocalSave = {
  project?: Omit<ProjectInfos, 'id'>;
};

export async function save(
  data: LocalSave,
  { directoryPath, override }: { directoryPath?: string; override?: boolean } = {}
) {
  const alreadyInFileData = await retrieve({ directoryPath });
  let storedData = { ...alreadyInFileData, ...data };
  if (override) {
    storedData = data;
  } else {
    const alreadyInFileData = await retrieve({ directoryPath });
    storedData = { ...alreadyInFileData, ...data };
  }
  const pathToFile = path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);
  // Ensure the directory exists
  await fse.ensureDir(path.dirname(pathToFile));
  await fse.writeJson(pathToFile, storedData, { encoding: 'utf8' });
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
