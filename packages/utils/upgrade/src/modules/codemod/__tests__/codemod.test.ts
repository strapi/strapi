import path from 'node:path';
import semver from 'semver';
import { Codemod, codemodFactory } from '../codemod';
import * as constants from '../constants';
import type { Kind } from '../types';
import type { Version } from '../../version';

describe('Codemod', () => {
  const kind: Kind = 'code';
  const version: Version.SemVer = new semver.SemVer('1.0.0');
  const baseDirectory = '/base/directory';
  const filename = `example.${constants.CODEMOD_CODE_SUFFIX}.${constants.CODEMOD_EXTENSION}`;
  let codemod: Codemod;

  beforeEach(() => {
    codemod = new Codemod({ kind, version, baseDirectory, filename });
  });

  describe('constructor', () => {
    it('should set properties correctly', () => {
      expect(codemod.kind).toBe(kind);
      expect(codemod.version).toBe(version);
      expect(codemod.baseDirectory).toBe(baseDirectory);
      expect(codemod.filename).toBe(filename);
      expect(codemod.path).toBe(path.join(baseDirectory, version.raw, filename));
    });
  });

  describe('format', () => {
    it('should return the correctly formatted filename', () => {
      const formattedFilename = codemod.format();
      const expectedFilename = 'example';
      expect(formattedFilename).toBe(expectedFilename);
    });
  });

  describe('codemodFactory', () => {
    it('should create and return a new Codemod instance with correct properties', () => {
      const newCodemod = codemodFactory({ kind, version, baseDirectory, filename });
      expect(newCodemod).toBeInstanceOf(Codemod);
      expect(newCodemod.kind).toBe(kind);
      expect(newCodemod.version).toBe(version);
      expect(newCodemod.baseDirectory).toBe(baseDirectory);
      expect(newCodemod.filename).toBe(filename);
    });
  });
});
