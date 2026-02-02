import fse from 'fs-extra';

import type { Utils } from '@strapi/types';

export const readJSON = async (path: string): Promise<Utils.JSONValue> => {
  const buffer = await fse.readFile(path);

  return JSON.parse(buffer.toString());
};

export const saveJSON = async (path: string, json: Utils.JSONValue): Promise<void> => {
  const jsonAsString = `${JSON.stringify(json, null, 2)}\n`;

  await fse.writeFile(path, jsonAsString);
};
