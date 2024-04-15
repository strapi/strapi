import path from 'path';
import os from 'os';
import fs from 'fs';
import XDGAppPaths from 'xdg-app-paths';

const APP_FOLDER_NAME = 'com.strapi.cli';

export const CONFIG_FILENAME = 'config.json';

export type LocalConfig = {
  token?: string;
};

function checkDirectoryExists(directoryPath: string) {
  try {
    return fs.lstatSync(directoryPath).isDirectory();
  } catch (e) {
    return false;
  }
}

// Determine storage path based on the operating system
export function getTmpStoragePath() {
  const storagePath = path.join(os.tmpdir(), APP_FOLDER_NAME);
  if (!checkDirectoryExists(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  return storagePath;
}

function getConfigPath() {
  const configDirs = XDGAppPaths(APP_FOLDER_NAME).configDirs();
  const configPath = configDirs.find(checkDirectoryExists);

  if (!configPath) {
    fs.mkdirSync(configDirs[0], { recursive: true });
    return configDirs[0];
  }
  return configPath;
}

export function getLocalConfig(): LocalConfig {
  const configPath = getConfigPath();
  const configFilePath = path.join(configPath, CONFIG_FILENAME);
  if (!fs.existsSync(configFilePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
  } catch (e) {
    return {};
  }
}

export function saveLocalConfig(data: LocalConfig) {
  const configPath = getConfigPath();
  const configFilePath = path.join(configPath, CONFIG_FILENAME);
  fs.writeFileSync(configFilePath, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 });
}
