import fse from 'fs-extra';
import type { JSONObject } from './types';

export const replaceJson = async (path: string, jsonObject: JSONObject) => {
  return fse.writeFile(path, `${JSON.stringify(jsonObject, null, 2)}\n`);
};
