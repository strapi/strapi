'use strict';

const { join, extname, basename } = require('path');
const { existsSync } = require('fs-extra');
const _ = require('lodash');
const fse = require('fs-extra');
const { isKebabCase } = require('@strapi/utils');

// to handle names with numbers in it we first check if it is already in kebabCase
const normalizeName = name => (isKebabCase(name) ? name : _.kebabCase(name));

const DEFAULT_CONTENT_TYPE = {
  schema: {},
  actions: {},
  lifecycles: {},
};

module.exports = async strapi => {
  if (!existsSync(strapi.dirs.api)) {
    throw new Error('Missing api folder. Please create one at `./src/api`');
  }

  const apisFDs = await fse.readdir(strapi.dirs.api, { withFileTypes: true });
  const apis = {};

  // only load folders
  for (const apiFD of apisFDs) {
    if (apiFD.isDirectory()) {
      const apiName = normalizeName(apiFD.name);
      const api = await loadAPI(join(strapi.dirs.api, apiFD.name));

      apis[apiName] = api;
    }
  }

  validateContentTypesUnicity(apis);

  for (const apiName in apis) {
    strapi.container.get('apis').add(apiName, apis[apiName]);
  }
};

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

const loadAPI = async dir => {
  const [
    index,
    config,
    routes,
    controllers,
    services,
    policies,
    middlewares,
    contentTypes,
  ] = await Promise.all([
    loadIndex(dir),
    loadDir(join(dir, 'config')),
    loadDir(join(dir, 'routes')),
    loadDir(join(dir, 'controllers')),
    loadDir(join(dir, 'services')),
    loadDir(join(dir, 'policies')),
    loadDir(join(dir, 'middlewares')),
    loadContentTypes(join(dir, 'content-types')),
  ]);

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

const loadIndex = async dir => {
  if (await fse.pathExists(join(dir, 'index.js'))) {
    return loadFile(join(dir, 'index.js'));
  }
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

    contentTypes[normalizeName(contentTypeName)] = _.defaults(contentType, DEFAULT_CONTENT_TYPE);
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
