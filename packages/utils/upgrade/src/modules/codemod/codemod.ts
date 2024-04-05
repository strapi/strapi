import path from 'node:path';

import * as constants from './constants';

import type { Codemod as CodemodInterface, FormatOptions, Kind, UID } from './types';
import type { Version } from '../version';

type CreateCodemodPayload = Pick<
  CodemodInterface,
  'kind' | 'version' | 'baseDirectory' | 'filename'
>;

export class Codemod implements CodemodInterface {
  uid: UID;

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
    this.uid = this.createUID();
  }

  private createUID(): UID {
    const name = this.format({ stripExtension: true, stripKind: true, stripHyphens: false });
    const kind = this.kind;
    const version = this.version.raw as Version.LiteralSemVer;

    return `${version}-${name}-${kind}`;
  }

  format(options?: FormatOptions) {
    const { stripExtension = true, stripKind = true, stripHyphens = true } = options ?? {};

    let formatted = this.filename;

    if (stripExtension) {
      formatted = formatted.replace(new RegExp(`\\.${constants.CODEMOD_EXTENSION}$`, 'i'), '');
    }

    if (stripKind) {
      formatted = formatted
        .replace(`.${constants.CODEMOD_CODE_SUFFIX}`, '')
        .replace(`.${constants.CODEMOD_JSON_SUFFIX}`, '');
    }

    if (stripHyphens) {
      formatted = formatted.replaceAll('-', ' ');
    }

    return formatted;
  }
}

export const codemodFactory = (options: CreateCodemodPayload) => new Codemod(options);
