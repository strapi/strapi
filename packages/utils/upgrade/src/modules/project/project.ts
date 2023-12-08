import path from 'node:path';
import assert from 'node:assert';
import fse from 'fs-extra';
import semver from 'semver';

import { semVerFactory, isLiteralSemVer } from '../version';
import { fileScannerFactory } from '../file-scanner';
import { codeRunnerFactory } from '../runner/code';
import { jsonRunnerFactory } from '../runner/json';
import * as constants from './constants';

import type { Version } from '../version';
import type { Codemod } from '../codemod';
import type { Report } from '../report';
import type {
  Project as ProjectInterface,
  FileExtension,
  MinimalPackageJSON,
  RunCodemodsOptions,
} from './types';

export class Project implements ProjectInterface {
  public cwd: string;

  // The following properties are assigned during the .refresh() call in the constructor.

  public files!: string[];

  public packageJSONPath!: string;

  public packageJSON!: MinimalPackageJSON;

  public strapiVersion!: Version.SemVer;

  constructor(cwd: string) {
    if (!fse.pathExistsSync(cwd)) {
      throw new Error(`ENOENT: no such file or directory, access '${cwd}'`);
    }

    this.cwd = cwd;

    this.refresh();
  }

  getFilesByExtensions(extensions: FileExtension[]) {
    return this.files.filter((filePath) => {
      const fileExtension = path.extname(filePath) as FileExtension;

      return extensions.includes(fileExtension);
    });
  }

  refresh() {
    this.refreshPackageJSON();
    this.refreshStrapiVersion();
    this.refreshProjectFiles();

    return this;
  }

  async runCodemods(codemods: Codemod.List, options: RunCodemodsOptions) {
    const runners = this.createProjectCodemodsRunners(options.dry);
    const reports: Report.CodemodReport[] = [];

    for (const codemod of codemods) {
      for (const runner of runners) {
        if (runner.valid(codemod)) {
          const report = await runner.run(codemod);
          reports.push({ codemod, report });
        }
      }
    }

    return reports;
  }

  private createProjectCodemodsRunners(dry: boolean = false) {
    const jsonFiles = this.getFilesByExtensions(['.json']);
    const codeFiles = this.getFilesByExtensions(['.js', '.ts', '.mjs']);

    const codeRunner = codeRunnerFactory(codeFiles, {
      dry,
      print: false,
      silent: true,
      extensions: 'js,ts',
      runInBand: true,
      verbose: 0,
      babel: true,
    });
    const jsonRunner = jsonRunnerFactory(jsonFiles, { dry, cwd: this.cwd });

    return [codeRunner, jsonRunner] as const;
  }

  private refreshPackageJSON(): void {
    const packageJSONPath = path.join(this.cwd, constants.PROJECT_PACKAGE_JSON);

    try {
      fse.accessSync(packageJSONPath);
    } catch {
      throw new Error(`Could not find a ${constants.PROJECT_PACKAGE_JSON} file in ${this.cwd}`);
    }

    const packageJSONBuffer = fse.readFileSync(packageJSONPath);

    this.packageJSONPath = packageJSONPath;
    this.packageJSON = JSON.parse(packageJSONBuffer.toString());
  }

  private refreshProjectFiles(): void {
    const allowedRootPaths = formatGlobCollectionPattern(
      constants.PROJECT_DEFAULT_ALLOWED_ROOT_PATHS
    );

    const allowedExtensions = formatGlobCollectionPattern(
      constants.PROJECT_DEFAULT_ALLOWED_EXTENSIONS
    );

    const projectFilesPattern = `./${allowedRootPaths}/**/*.${allowedExtensions}`;

    const patterns = [projectFilesPattern, ...constants.PROJECT_DEFAULT_PATTERNS];
    const scanner = fileScannerFactory(this.cwd);

    this.files = scanner.scan(patterns);
  }

  private refreshStrapiVersion(): void {
    this.strapiVersion =
      // First try to get the strapi version from the package.json dependencies
      this.findStrapiVersionFromProjectPackageJSON() ??
      // If the version found is not a valid SemVer, get the Strapi version from the installed package
      this.findLocallyInstalledStrapiVersion();
  }

  private findStrapiVersionFromProjectPackageJSON(): Version.SemVer | undefined {
    const projectName = this.packageJSON.name;
    const version = this.packageJSON.dependencies?.[constants.STRAPI_DEPENDENCY_NAME];

    if (version === undefined) {
      throw new Error(
        `No version of ${constants.STRAPI_DEPENDENCY_NAME} was found in ${projectName}. Are you in a valid Strapi project?`
      );
    }

    const isValidSemVer = isLiteralSemVer(version) && semver.valid(version) === version;

    // We return undefined only if a strapi/strapi version is found, but it's not semver compliant
    return isValidSemVer ? semVerFactory(version) : undefined;
  }

  private findLocallyInstalledStrapiVersion(): Version.SemVer {
    const packageSearchText = `${constants.STRAPI_DEPENDENCY_NAME}/package.json`;

    let strapiPackageJSONPath: string;
    let strapiPackageJSON: MinimalPackageJSON;

    try {
      strapiPackageJSONPath = require.resolve(packageSearchText, { paths: [this.cwd] });
      strapiPackageJSON = require(strapiPackageJSONPath);

      assert(typeof strapiPackageJSON === 'object');
    } catch {
      throw new Error(
        `Cannot resolve module "${constants.STRAPI_DEPENDENCY_NAME}" from paths [${this.cwd}]`
      );
    }

    const strapiVersion = strapiPackageJSON.version;
    const isValidSemVer = isLiteralSemVer(strapiVersion);

    if (!isValidSemVer) {
      throw new Error(
        `Invalid ${constants.STRAPI_DEPENDENCY_NAME} version found in ${strapiPackageJSONPath} (${strapiVersion})`
      );
    }

    return semVerFactory(strapiVersion);
  }
}

const formatGlobCollectionPattern = (collection: string[]): string => {
  assert(
    collection.length > 0,
    'Invalid pattern provided, the given collection needs at least 1 element'
  );

  return collection.length === 1 ? collection[0] : `{${collection}}`;
};

export const projectFactory = (cwd: string) => new Project(cwd);
