import { join, extname, basename } from 'path';
import fse, { existsSync } from 'fs-extra';
import _ from 'lodash';
import { strings, importDefault } from '@strapi/utils';
import { isEmpty } from 'lodash/fp';
import type { Core, Struct } from '@strapi/types';
import { getGlobalId, type ContentTypeDefinition } from '../domain/content-type';

interface API {
  bootstrap: () => void | Promise<void>;
  destroy: () => void | Promise<void>;
  register: () => void | Promise<void>;
  config: Record<string, unknown>;
  routes: Record<string, Core.Router>;
  controllers: Record<string, Core.Controller>;
  services: Record<string, Core.Service>;
  policies: Record<string, Core.Policy>;
  middlewares: Record<string, Core.Middleware>;
  contentTypes: Record<string, { schema: Struct.ContentTypeSchema }>;
}

interface APIs {
  [key: string]: API;
}

const DEFAULT_CONTENT_TYPE = {
  schema: {},
  actions: {},
  lifecycles: {},
};

// to handle names with numbers in it we first check if it is already in kebabCase
const normalizeName = (name: string) => (strings.isKebabCase(name) ? name : _.kebabCase(name));

const isDirectory = (fd: fse.Dirent) => fd.isDirectory();
const isDotFile = (fd: fse.Dirent) => fd.name.startsWith('.');

export default async function loadAPIs(strapi: Core.Strapi) {
  if (!existsSync(strapi.dirs.dist.api)) {
    return;
  }

  const apisFDs = await (await fse.readdir(strapi.dirs.dist.api, { withFileTypes: true }))
    .filter(isDirectory)
    .filter(_.negate(isDotFile));

  const apis: APIs = {};

  // only load folders
  for (const apiFD of apisFDs) {
    const apiName = normalizeName(apiFD.name);
    const api = await loadAPI(apiName, join(strapi.dirs.dist.api, apiFD.name));

    // @ts-expect-error TODO verify that it's a valid api, not missing bootstrap, register, and destroy
    apis[apiName] = api;
  }

  validateContentTypesUnicity(apis);

  for (const apiName of Object.keys(apis)) {
    strapi.get('apis').add(apiName, apis[apiName]);
  }
}

const validateContentTypesUnicity = (apis: APIs) => {
  const allApisSchemas = Object.values(apis).flatMap((api) => Object.values(api.contentTypes));

  const names: string[] = [];
  allApisSchemas.forEach(({ schema }) => {
    if (schema.info.singularName) {
      const singularName = _.kebabCase(schema.info.singularName);
      if (names.includes(singularName)) {
        throw new Error(`The singular name "${schema.info.singularName}" should be unique`);
      }
      names.push(singularName);
    }

    if (schema.info.pluralName) {
      const pluralName = _.kebabCase(schema.info.pluralName);
      if (names.includes(pluralName)) {
        throw new Error(`The plural name "${schema.info.pluralName}" should be unique`);
      }
      names.push(pluralName);
    }
  });
};

const loadAPI = async (apiName: string, dir: string) => {
  const [index, config, routes, controllers, services, policies, middlewares, contentTypes] = (
    await Promise.all([
      loadIndex(dir),
      loadDir(join(dir, 'config')),
      loadDir(join(dir, 'routes')),
      loadDir(join(dir, 'controllers')),
      loadDir(join(dir, 'services')),
      loadDir(join(dir, 'policies')),
      loadDir(join(dir, 'middlewares')),
      loadContentTypes(apiName, join(dir, 'content-types')),
    ])
  ).map((result) => result?.result);

  return {
    ...(index || {}),
    config: config || {},
    routes: routes || [],
    controllers: controllers || {},
    services: services || {},
    policies: policies || {},
    middlewares: middlewares || {},
    contentTypes: contentTypes || {},
  };
};

const loadIndex = async (dir: string) => {
  if (await fse.pathExists(join(dir, 'index.js'))) {
    return loadFile(join(dir, 'index.js'));
  }
};

// because this is async and its contents are dynamic, we must return it within an object to avoid a property called `then` being interpreted as a Promise
const loadContentTypes = async (apiName: string, dir: string) => {
  if (!(await fse.pathExists(dir))) {
    return;
  }

  const fds = await fse.readdir(dir, { withFileTypes: true });
  const contentTypes: API['contentTypes'] = {};

  // only load folders
  for (const fd of fds) {
    if (fd.isFile()) {
      continue;
    }

    const contentTypeName = normalizeName(fd.name);
    const loadedContentType = (await loadDir(join(dir, fd.name)))?.result;

    if (isEmpty(loadedContentType) || isEmpty(loadedContentType.schema)) {
      throw new Error(`Could not load content type found at ${dir}`);
    }

    const contentType = {
      ...DEFAULT_CONTENT_TYPE,
      ...loadedContentType,
    } as ContentTypeDefinition;

    Object.assign(contentType.schema, {
      apiName,
      collectionName: contentType.schema.collectionName || contentType.schema.info.singularName,
      globalId: getGlobalId(contentType.schema),
    });

    contentTypes[normalizeName(contentTypeName)] = contentType;
  }

  return { result: contentTypes };
};

// because this is async and its contents are dynamic, we must return it within an object to avoid a property called `then` being interpreted as a Promise
const loadDir = async (dir: string) => {
  if (!(await fse.pathExists(dir))) {
    return;
  }

  const fds = await fse.readdir(dir, { withFileTypes: true });

  const root: Record<string, unknown> = {};
  for (const fd of fds) {
    if (!fd.isFile() || extname(fd.name) === '.map') {
      continue;
    }

    const key = basename(fd.name, extname(fd.name));

    root[normalizeName(key)] = (await loadFile(join(dir, fd.name))).result;
  }

  return { result: root };
};

// because this is async and its contents are dynamic, we must return it as an array to avoid a property called `then` being interpreted as a Promise
const loadFile = async (file: string): Promise<{ result: unknown }> => {
  const ext = extname(file);

  switch (ext) {
    case '.js':
      return { result: importDefault(file) };
    case '.json':
      return { result: await fse.readJSON(file) };
    default:
      return { result: {} };
  }
};
