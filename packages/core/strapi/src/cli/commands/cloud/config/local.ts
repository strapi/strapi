import path from 'path';
import os from 'os';
import fs from 'fs';

export const TMP_DIR = path.join(os.tmpdir(), 'strapi-cli');
export const TMP_TOKEN_FILE = 'strapi.cloud';

// Determine storage path based on the operating system
export function getStoragePath() {
  const storagePath = TMP_DIR;
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  return storagePath;
}
