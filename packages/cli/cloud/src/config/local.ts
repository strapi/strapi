import path from 'path';
import os from 'os';
import fse from 'fs-extra';
import XDGAppPaths from 'xdg-app-paths';

const APP_FOLDER_NAME = 'com.strapi.cli';

export const CONFIG_FILENAME = 'config.json';

export type LocalConfig = {
  token?: string;
  deviceId?: string;
};

async function checkDirectoryExists(directoryPath: string) {
  try {
    const fsStat = await fse.lstat(directoryPath);
    return fsStat.isDirectory();
  } catch (e) {
    return false;
  }
}

// Determine storage path based on the operating system
export async function getTmpStoragePath() {
  const storagePath = path.join(os.tmpdir(), APP_FOLDER_NAME);
  await fse.ensureDir(storagePath);
  return storagePath;
}

async function getConfigPath() {
  const configDirs = XDGAppPaths(APP_FOLDER_NAME).configDirs();
  const configPath = configDirs.find(checkDirectoryExists);

  if (!configPath) {
    await fse.ensureDir(configDirs[0]);
    return configDirs[0];
  }
  return configPath;
}

export async function getLocalConfig(): Promise<LocalConfig> {
  const configPath = await getConfigPath();
  const configFilePath = path.join(configPath, CONFIG_FILENAME);
  await fse.ensureFile(configFilePath);
  try {
    return await fse.readJSON(configFilePath, { encoding: 'utf8', throws: true });
  } catch (e) {
    return {};
  }
}

export async function saveLocalConfig(data: LocalConfig) {
  const configPath = await getConfigPath();
  const configFilePath = path.join(configPath, CONFIG_FILENAME);
  await fse.writeJson(configFilePath, data, { encoding: 'utf8', spaces: 2, mode: 0o600 });
}
