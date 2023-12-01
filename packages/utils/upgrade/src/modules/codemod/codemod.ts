import path from 'node:path';

import * as constants from './constants';

import type { Codemod as CodemodInterface, Kind } from './types';
import type { Version } from '../version';

type CreateCodemodPayload = Pick<
  CodemodInterface,
  'kind' | 'version' | 'baseDirectory' | 'filename'
>;

class Codemod implements CodemodInterface {
  kind: Kind;
  version: Version.SemVer;
  baseDirectory: string;
  filename: string;
  path: string;

  constructor(options: CreateCodemodPayload) {
    this.kind = options.kind;
    this.version = options.version;
    this.baseDirectory = options.baseDirectory;
    this.filename = options.filename;

    this.path = path.join(this.baseDirectory, this.version.raw, this.filename);
  }

  format() {
    return this.filename
      .replace(`.${constants.CODEMOD_CODE_SUFFIX}.${constants.CODEMOD_EXTENSION}`, '')
      .replace(`.${constants.CODEMOD_JSON_SUFFIX}.${constants.CODEMOD_EXTENSION}`, '')
      .replaceAll('-', ' ');
  }
}

export const codemodFactory = (options: CreateCodemodPayload) => new Codemod(options);
