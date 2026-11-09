import fs from 'node:fs/promises';
import path from 'node:path';
import type { Core } from '@strapi/types';

import type { CodeFinding } from '../../../../shared/contracts/migration';
import {
  endUsersConfigBlock,
  switchPluginsConfig,
  createPluginsConfig,
  USERS_PERMISSIONS_LINE,
} from './config-plugins';
import type { UsersPermissionsSettings } from './config-plugins';
import { scanCode } from './code';
import { planSchemaChanges } from './schemas';
import type { FileChange } from './types';

const UP_PLUGIN = 'users-permissions';
const UP_CONFIG = `plugin::${UP_PLUGIN}`;
const SOURCE_FILE = /\.(json|[cm]?[jt]s)$/;
/** A file bigger than this is not read: no schema or source of a project is */
const MAX_FILE_BYTES = 1024 * 1024;
const SKIPPED_FOLDERS = new Set(['node_modules', '.git']);
const CONFIG_FILES = ['config/plugins.ts', 'config/plugins.js'];

export type ProjectFilesReason = 'not-development' | 'no-source' | 'config-not-editable';

export interface ProjectFiles {
  writable: boolean;
  reason: ProjectFilesReason | null;
  /** The schema files only; the config file is never sent back */
  changes: FileChange[];
  /** The `'end-users'` entry, for a project that edits its config by hand */
  configBlock: string;
  /** The line that turns Users & Permissions off, for the same */
  usersPermissionsLine: string;
  findings: CodeFinding[];
}

/** What the server writes: `ProjectFiles` and the change to `config/plugins`, which never leaves it */
export interface ProjectFilesPlan extends ProjectFiles {
  configChange: FileChange | null;
}

/** Whether the project's files may be written from the admin: a development server that reloads */
export const isDevelopmentServer = (strapi: Core.Strapi): boolean =>
  process.env.NODE_ENV === 'development' && strapi.config.get('autoReload') === true;

const readText = async (file: string): Promise<string | null> => {
  try {
    const stat = await fs.stat(file);

    return stat.isFile() && stat.size <= MAX_FILE_BYTES ? await fs.readFile(file, 'utf8') : null;
  } catch {
    return null;
  }
};

/** The readable files under `src/`, by project-relative path with forward slashes */
const readSource = async (srcDir: string): Promise<Map<string, string>> => {
  const files = new Map<string, string>();

  const walk = async (dir: string, relative: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const child = `${relative}/${entry.name}`;

      if (entry.isDirectory()) {
        if (!SKIPPED_FOLDERS.has(entry.name)) {
          await walk(path.join(dir, entry.name), child);
        }
      } else if (entry.isFile() && SOURCE_FILE.test(entry.name)) {
        const text = await readText(path.join(dir, entry.name));

        if (text !== null) {
          files.set(child, text);
        }
      }
    }
  };

  await walk(srcDir, 'src');

  return files;
};

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Users & Permissions' live settings, as `endUsersConfigBlock` reads them */
const readSettings = async (strapi: Core.Strapi): Promise<UsersPermissionsSettings> => {
  const live = strapi.config.get<unknown>(UP_CONFIG);
  const config = isPlain(live) ? live : {};
  const jwtSecret = config.jwtSecret;
  let callbacks: Record<string, string> | null = null;

  try {
    const grant = await strapi.store({ type: 'plugin', name: UP_PLUGIN, key: 'grant' }).get({});

    if (isPlain(grant)) {
      const found: Record<string, string> = {};

      for (const [id, entry] of Object.entries(grant)) {
        const callback = isPlain(entry) ? (entry.callback ?? entry.callbackUrl) : undefined;

        if (typeof callback === 'string' && callback.trim() !== '') {
          found[id] = callback.trim();
        }
      }

      callbacks = Object.keys(found).length > 0 ? found : null;
    }
  } catch {
    // No grant store: there is nothing to carry over
  }

  return {
    config,
    jwtSecretFromEnv:
      typeof jwtSecret === 'string' && jwtSecret !== '' && jwtSecret === process.env.JWT_SECRET,
    callbacks,
  };
};

const noSource = (): CodeFinding => ({
  path: 'src',
  line: null,
  rule: 'no-source',
  message:
    'This project has no src folder here (it is deployed from a build, or runs from another folder), so its files cannot be planned. Make the changes by hand.',
});

/**
 * What a project changes to move from Users & Permissions to this plugin: its schema files, the
 * code that names the old plugin, and `config/plugins`. Reads the project and writes nothing.
 */
export const planProjectFiles = async (strapi: Core.Strapi): Promise<ProjectFilesPlan> => {
  const { src: srcDir, root: appDir } = strapi.dirs.app;
  const development = isDevelopmentServer(strapi);

  const base: ProjectFilesPlan = {
    writable: true,
    reason: null,
    changes: [],
    configBlock: '',
    usersPermissionsLine: USERS_PERMISSIONS_LINE,
    findings: [],
    configChange: null,
  };

  const finish = (plan: ProjectFilesPlan, reason: ProjectFilesReason | null): ProjectFilesPlan => {
    const found = !development ? 'not-development' : reason;

    return { ...plan, writable: found === null, reason: found };
  };

  const srcStat = await fs.stat(srcDir).catch(() => null);

  if (!srcStat?.isDirectory()) {
    return finish({ ...base, findings: [noSource()] }, 'no-source');
  }

  const files = await readSource(srcDir);
  const schemas = planSchemaChanges(files);
  const findings = [...schemas.findings];

  for (const [file, source] of files) {
    findings.push(...scanCode(file, source));
  }

  const settings = await readSettings(strapi);
  let reason: ProjectFilesReason | null = null;
  let configChange: FileChange | null = null;
  let source: string | null = null;
  let configPath = CONFIG_FILES[0];

  for (const candidate of CONFIG_FILES) {
    const text = await readText(path.join(appDir, ...candidate.split('/')));

    if (text !== null) {
      source = text;
      configPath = candidate;
      break;
    }
  }

  const { block, findings: blockFindings } = await endUsersConfigBlock(settings, source, {
    path: configPath,
  });

  findings.push(...blockFindings);

  if (source === null) {
    const typescript = await fs.access(path.join(appDir, 'tsconfig.json')).then(
      () => true,
      () => false
    );

    configPath = typescript ? CONFIG_FILES[0] : CONFIG_FILES[1];
    configChange = {
      path: configPath,
      before: null,
      after: createPluginsConfig(typescript, block),
    };
  } else {
    const switched = await switchPluginsConfig(configPath, source, block);

    findings.push(...switched.findings);

    if (switched.after === null) {
      reason = 'config-not-editable';
    } else if (switched.after !== source) {
      configChange = { path: configPath, before: source, after: switched.after };
    }
  }

  return finish(
    {
      ...base,
      changes: schemas.changes,
      configBlock: block,
      findings,
      configChange,
    },
    reason
  );
};

const SECRET_KEY = /secret|password|token|key$/i;
const LITERAL_VALUE =
  /^(\s*)(['"]?)([\w.-]+)\2:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`|\d+)(,?)\s*$/;

const envName = (key: string, parents: string[]): string =>
  key === 'secret' && parents.includes('legacyJwt')
    ? 'JWT_SECRET'
    : key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .toUpperCase();

/**
 * The block as it may be shown: a secret-bearing key keeps its text only when it reads the
 * environment; a literal becomes an `env()` call and a finding. The file the server writes keeps
 * what the project wrote, as it is already in their file.
 */
const redactBlock = (block: string): { block: string; findings: CodeFinding[] } => {
  const findings: CodeFinding[] = [];
  const parents: string[] = [];
  const lines = block.split('\n').map((line) => {
    const match = LITERAL_VALUE.exec(line);

    if (!match) {
      const opener = /^\s*(?:['"]?)([\w.-]+)(?:['"]?):\s*\{\s*$/.exec(line);

      if (opener) parents.push(opener[1]);
      else if (/^\s*\},?\s*$/.test(line)) parents.pop();

      return line;
    }

    const [, indent, quote, key, , comma] = match;

    if (!SECRET_KEY.test(key)) return line;

    const name = envName(key, parents);

    findings.push({
      path: 'config/plugins',
      line: null,
      rule: 'legacy-secret',
      message: `The config writes ${key} as a literal. Read it from an environment variable (${name}) instead; it is shown here as env('${name}').`,
    });

    return `${indent}${quote}${key}${quote}: env('${name}')${comma}`;
  });

  return { block: lines.join('\n'), findings };
};

/** What the Content API may send: the plan without the change to the config file, no literal secret */
export const publicProjectFiles = (plan: ProjectFilesPlan): ProjectFiles => {
  const { configChange: _configChange, ...files } = plan;
  const redacted = redactBlock(files.configBlock);

  return {
    ...files,
    configBlock: redacted.block,
    findings: [...files.findings, ...redacted.findings],
  };
};
