import fs from 'fs';
import path from 'path';
import type { ProjectInfos } from './cli-api';

export const LOCAL_SAVE_FILENAME = '.strapi-cloud.json';

export type LocalSave = {
  project?: ProjectInfos;
};

export function save(data: LocalSave, { directoryPath }: { directoryPath?: string } = {}) {
  const storedData = { ...retrieve(), ...data };
  const pathToFile = path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);
  // Ensure the directory exists
  if (!fs.existsSync(path.dirname(pathToFile))) {
    fs.mkdirSync(path.dirname(pathToFile), { recursive: true });
  }
  fs.writeFileSync(pathToFile, JSON.stringify(storedData), 'utf8');
}

export function retrieve({ directoryPath }: { directoryPath?: string } = {}): LocalSave {
  const pathToFile = path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);
  if (!fs.existsSync(pathToFile)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(pathToFile, 'utf8'));
}

export function erase({ directoryPath }: { directoryPath?: string } = {}) {
  const pathToFile = path.join(directoryPath || process.cwd(), LOCAL_SAVE_FILENAME);
  if (fs.existsSync(pathToFile)) {
    fs.unlinkSync(pathToFile);
  }
}
