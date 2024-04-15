import fs from 'fs';
import type { ProjectInfos } from './cli-api';

const LOCAL_SAVE_FILENAME = '.strapi-cloud.json';

export type LocalSave = {
  project?: ProjectInfos;
};

export function save(data: LocalSave) {
  const storedData = { ...retrieve(), ...data };
  fs.writeFileSync(LOCAL_SAVE_FILENAME, JSON.stringify(storedData), 'utf8');
}

export function retrieve(): LocalSave {
  if (!fs.existsSync(LOCAL_SAVE_FILENAME)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(LOCAL_SAVE_FILENAME, 'utf8'));
}

export function erase() {
  if (fs.existsSync(LOCAL_SAVE_FILENAME)) {
    fs.unlinkSync(LOCAL_SAVE_FILENAME);
  }
}
