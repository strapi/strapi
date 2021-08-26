'use strict';

const { join, extname, basename } = require('path');
const { existsSync } = require('fs-extra');
const _ = require('lodash');
const fse = require('fs-extra');

const normalizeName = _.toLower;

const defaultAPI = {
  config: {},
  routes: [],
  controllers: {},
  services: {},
  contentTypes: {},
  policies: {},
  middlewares: {},
};

const defaultContentType = {
  schema: {},
  actions: {},
  lifecycles: {},
};

// TODO: function to be moved next to where the api will be loaded
const validateContentTypesUnicity = apis => {
  const allApisSchemas = Object.values(apis).flatMap(api => Object.values(api.contentTypes));

  const names = [];
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

module.exports = async strapi => {
  const apisDir = join(strapi.dir, 'api');

  if (!existsSync(apisDir)) {
    throw new Error(`Missing api folder. Please create one in your app root directory`);
  }

  const apisFDs = await fse.readdir(apisDir, { withFileTypes: true });
  const apis = {};

  // only load folders
  for (const apiFD of apisFDs) {
    if (apiFD.isDirectory()) {
      const apiName = normalizeName(apiFD.name);
      const api = await loadAPI(join(apisDir, apiFD.name));

      apis[apiName] = _.defaults(api, defaultAPI);
    }
  }

  validateContentTypesUnicity(apis);

  return apis;
};

const loadAPI = async dir => {
  const [
    config,
    routes,
    controllers,
    services,
    policies,
    middlewares,
    contentTypes,
  ] = await Promise.all([
    loadDir(join(dir, 'config')),
    loadDir(join(dir, 'routes')),
    loadDir(join(dir, 'controllers')),
    loadDir(join(dir, 'services')),
    loadDir(join(dir, 'policies')),
    loadDir(join(dir, 'middlewares')),
    loadContentTypes(join(dir, 'content-types')),
  ]);

  return {
    config,
    routes,
    controllers,
    services,
    policies,
    middlewares,
    contentTypes,
  };
};

const loadContentTypes = async dir => {
  if (!(await fse.pathExists(dir))) {
    return;
  }

  const fds = await fse.readdir(dir, { withFileTypes: true });
  const contentTypes = {};

  // only load folders
  for (const fd of fds) {
    if (fd.isFile()) {
      continue;
    }

    const contentTypeName = normalizeName(fd.name);
    const contentType = await loadDir(join(dir, fd.name));
    contentTypes[normalizeName(contentTypeName)] = _.defaults(contentType, defaultContentType);
  }

  return contentTypes;
};

const loadDir = async dir => {
  if (!(await fse.pathExists(dir))) {
    return;
  }

  const fds = await fse.readdir(dir, { withFileTypes: true });

  const root = {};
  for (const fd of fds) {
    if (!fd.isFile()) {
      continue;
    }

    const key = basename(fd.name, extname(fd.name));
    root[normalizeName(key)] = await loadFile(join(dir, fd.name));
  }

  return root;
};

const loadFile = file => {
  const ext = extname(file);

  switch (ext) {
    case '.js':
      return require(file);
    case '.json':
      return fse.readJSON(file);
    default:
      return {};
  }
};
