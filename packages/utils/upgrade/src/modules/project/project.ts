import path from 'node:path';
import assert from 'node:assert';
import fse from 'fs-extra';
import semver from 'semver';

import { semVerFactory, isLiteralSemVer, isValidSemVer } from '../version';
import { fileScannerFactory } from '../file-scanner';
import { codeRunnerFactory } from '../runner/code';
import { jsonRunnerFactory } from '../runner/json';
import * as constants from './constants';

import type { Version } from '../version';
import type { Codemod } from '../codemod';
import type { Report } from '../report';
import type {
  FileExtension,
  MinimalPackageJSON,
  ProjectConfig,
  ProjectType,
  RunCodemodsOptions,
} from './types';

export class Project {
  public cwd: string;

  // The following properties are assigned during the .refresh() call in the constructor.

  public files!: string[];

  public packageJSONPath!: string;

  public packageJSON!: MinimalPackageJSON;

  public readonly paths: string[];

  constructor(cwd: string, config: ProjectConfig) {
    if (!fse.pathExistsSync(cwd)) {
      throw new Error(`ENOENT: no such file or directory, access '${cwd}'`);
    }

    this.cwd = cwd;
    this.paths = config.paths;

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
    const jsonExtensions = constants.PROJECT_JSON_EXTENSIONS.map<FileExtension>((ext) => `.${ext}`);
    const codeExtensions = constants.PROJECT_CODE_EXTENSIONS.map<FileExtension>((ext) => `.${ext}`);

    const jsonFiles = this.getFilesByExtensions(jsonExtensions);
    const codeFiles = this.getFilesByExtensions(codeExtensions);

    const codeRunner = codeRunnerFactory(codeFiles, {
      dry,
      parser: 'ts',
      runInBand: true,
      babel: true,
      extensions: constants.PROJECT_CODE_EXTENSIONS.join(','),
      // Don't output any log coming from the runner
      print: false,
      silent: true,
      verbose: 0,
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
    const scanner = fileScannerFactory(this.cwd);

    this.files = scanner.scan(this.paths);
  }
}

export class AppProject extends Project {
  public strapiVersion!: Version.SemVer;

  readonly type = 'application' as const satisfies ProjectType;

  /**
   * Returns an array of allowed file paths for a Strapi application
   *
   * The resulting paths include app default files and the root package.json file.
   */
  private static get paths() {
    const allowedRootPaths = formatGlobCollectionPattern(constants.PROJECT_APP_ALLOWED_ROOT_PATHS);
    const allowedExtensions = formatGlobCollectionPattern(constants.PROJECT_ALLOWED_EXTENSIONS);

    return [
      // App default files
      `./${allowedRootPaths}/**/*.${allowedExtensions}`,
      `!./**/node_modules/**/*`,
      `!./**/dist/**/*`,
      // Root package.json file
      constants.PROJECT_PACKAGE_JSON,
    ];
  }

  constructor(cwd: string) {
    super(cwd, { paths: AppProject.paths });
    this.refreshStrapiVersion();
  }

  refresh() {
    super.refresh();
    this.refreshStrapiVersion();
    return this;
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

    if (!isValidSemVer(strapiVersion)) {
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

export class PluginProject extends Project {
  readonly type = 'plugin' as const satisfies ProjectType;

  /**
   * Returns an array of allowed file paths for a Strapi plugin
   *
   * The resulting paths include plugin default files, the root package.json file, and plugin-specific files.
   */
  private static get paths() {
    const allowedRootPaths = formatGlobCollectionPattern(
      constants.PROJECT_PLUGIN_ALLOWED_ROOT_PATHS
    );
    const allowedExtensions = formatGlobCollectionPattern(constants.PROJECT_ALLOWED_EXTENSIONS);

    return [
      // Plugin default files
      `./${allowedRootPaths}/**/*.${allowedExtensions}`,
      `!./**/node_modules/**/*`,
      `!./**/dist/**/*`,
      // Root package.json file
      constants.PROJECT_PACKAGE_JSON,
      // Plugin root files
      ...constants.PROJECT_PLUGIN_ROOT_FILES,
    ];
  }

  constructor(cwd: string) {
    super(cwd, { paths: PluginProject.paths });
  }
}

const isPlugin = (cwd: string) => {
  const packageJSONPath = path.join(cwd, constants.PROJECT_PACKAGE_JSON);

  try {
    fse.accessSync(packageJSONPath);
  } catch {
    throw new Error(`Could not find a ${constants.PROJECT_PACKAGE_JSON} file in ${cwd}`);
  }

  const packageJSONBuffer = fse.readFileSync(packageJSONPath);

  const packageJSON = JSON.parse(packageJSONBuffer.toString());

  return packageJSON?.strapi?.kind === 'plugin';
};

// TODO: make this async so we can use async file methods
export const projectFactory = (cwd: string) => {
  fse.accessSync(cwd);

  return isPlugin(cwd) ? new PluginProject(cwd) : new AppProject(cwd);
};
