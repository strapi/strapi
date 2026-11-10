import path from 'node:path';
import * as ts from 'typescript';

import { getConfigPath } from '../../utils';

export type StrictArtifactsOutsideProgram = {
  /**
   * Absolute path of the config that defines the application program
   */
  configPath: string;
  /**
   * Absolute paths of the strict artifacts the program leaves out
   */
  missing: string[];
};

export type FindStrictArtifactsOutsideProgramOptions = {
  appDir: string;
  /**
   * Absolute path of the directory the artifacts are written to
   */
  generatedDir: string;
  /**
   * File names of the strict artifacts, relative to `generatedDir`
   */
  filenames: string[];
};

/**
 * The config TypeScript reads for the application directory: its tsconfig, else its jsconfig (a
 * JavaScript application), the order of the TypeScript language service.
 */
export const getAppConfigPath = (appDir: string) =>
  getConfigPath(appDir) ?? getConfigPath(appDir, { filename: 'jsconfig.json' });

/**
 * Lists the strict artifacts that the application program, the root files of its tsconfig (else its
 * jsconfig), leaves out. A program without `strict.d.ts` type-checks without strict types and reads
 * the generated schemas from the `Public` registry, with no error to tell, for example when the
 * tsconfig excludes `types/generated`.
 *
 * `undefined` when there is no config, when it has errors (the compilation reports them), and when
 * it is solution-style. Not `resolveConfigOptions`, which exits the process on tsconfig errors.
 */
export const findStrictArtifactsOutsideProgram = ({
  appDir,
  generatedDir,
  filenames,
}: FindStrictArtifactsOutsideProgramOptions): StrictArtifactsOutsideProgram | undefined => {
  const configPath = getAppConfigPath(appDir);

  if (configPath === undefined) {
    return undefined;
  }

  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, undefined, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => undefined,
  });

  if (parsed === undefined || parsed.errors.length > 0) {
    return undefined;
  }

  // TODO @Nico solution-style tsconfig: follow references before warning
  if (parsed.fileNames.length === 0 && parsed.projectReferences !== undefined) {
    return undefined;
  }

  // TODO @Nico a root file that imports or references a strict artifact also loads it in the
  // program; only the root files are checked, as building the program costs a full module resolution
  const rootFiles = new Set(parsed.fileNames.map((fileName) => path.resolve(fileName)));
  const missing = filenames
    .map((filename) => path.resolve(generatedDir, filename))
    .filter((filePath) => rootFiles.has(filePath) === false);

  return { configPath, missing };
};

const toDisplayPath = (filePath: string, appDir: string) =>
  path.relative(appDir, filePath).split(path.sep).join('/');

/**
 * The warning for strict artifacts that the application program leaves out, with paths relative to
 * the application directory.
 */
export const formatStrictProgramWarning = (
  { configPath, missing }: StrictArtifactsOutsideProgram,
  appDir: string
) =>
  `typescript.strictTypes is on, but ${toDisplayPath(configPath, appDir)} leaves out ` +
  `${missing.map((filePath) => toDisplayPath(filePath, appDir)).join(', ')}. ` +
  'The application type-checks without strict types, and reads the generated schemas as without ' +
  'strict types. Add these files to the program, for example by removing a types/generated exclusion.';
