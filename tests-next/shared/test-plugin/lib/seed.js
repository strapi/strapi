'use strict';

/**
 * Seeders: apply a seed plan to a loaded Strapi instance, through its services and the Document
 * Service. The plan is plain JSON (see `SeedPlan` in tests-next/shared/src/seed/types.ts), so the
 * same code runs before boot (seed-app.cjs) and in a running server (POST /api/tests/seed).
 *
 * Steps run in a fixed order, so a step can use what an earlier one created: locales, admin roles,
 * admin users, end users, media, entries, API tokens.
 */

const fs = require('node:fs');
const path = require('node:path');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
};

const fail = (message) => {
  const error = new Error(message);
  error.name = 'SeedError';
  return error;
};

const findAdminRole = async (strapi, code) => {
  const role = await strapi.db.query('admin::role').findOne({ where: { code } });
  if (!role) {
    throw fail(`Unknown admin role "${code}".`);
  }
  return role;
};

const seedLocales = async (strapi, locales, result) => {
  const service = strapi.plugin('i18n').service('locales');

  for (const { code, name = code, isDefault = false } of locales) {
    const locale = (await service.findByCode(code)) ?? (await service.create({ code, name }));
    if (isDefault) {
      await service.setDefaultLocale({ code });
    }
    result.locales.push({ id: locale.id, code });
  }
};

const seedAdminRoles = async (strapi, roles, result) => {
  const service = strapi.service('admin::role');

  for (const { name, code, description = '', permissions } of roles) {
    const role = await service.create({ name, description, ...(code ? { code } : {}) });
    if (permissions) {
      await service.assignPermissions(role.id, permissions);
    }
    result.adminRoles.push({ id: role.id, name, code: role.code });
  }
};

const seedAdminUsers = async (strapi, users, result) => {
  for (const { email, password, firstname, lastname, roles } of users) {
    const roleIds = [];
    for (const code of roles) {
      roleIds.push((await findAdminRole(strapi, code)).id);
    }

    const user = await strapi.service('admin::user').create({
      email,
      firstname,
      lastname,
      password,
      isActive: true,
      roles: roleIds,
    });
    result.adminUsers.push({ id: user.id, email });
  }
};

const seedUsers = async (strapi, users, result) => {
  for (const { username, email, password, role = 'authenticated', confirmed = true } of users) {
    const userRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: role } });
    if (!userRole) {
      throw fail(`Unknown users-permissions role type "${role}".`);
    }

    const user = await strapi.plugin('users-permissions').service('user').add({
      username,
      email,
      password,
      provider: 'local',
      confirmed,
      blocked: false,
      role: userRole.id,
    });
    result.users.push({ id: user.id, email });
  }
};

const seedMedia = async (strapi, files, result) => {
  const upload = strapi.plugin('upload').service('upload');

  for (const { file, name = path.basename(file), alternativeText, caption } of files) {
    if (!path.isAbsolute(file)) {
      throw fail(`Media paths must be absolute, got "${file}".`);
    }
    const mimetype = MIME_TYPES[path.extname(file).toLowerCase()];
    if (!mimetype) {
      throw fail(`No known MIME type for "${file}".`);
    }

    const [uploaded] = await upload.upload({
      data: { fileInfo: { name, alternativeText, caption } },
      files: [{ filepath: file, originalFilename: name, mimetype, size: fs.statSync(file).size }],
    });
    result.media.push({ id: uploaded.id, name: uploaded.name, url: uploaded.url });
  }
};

const seedEntries = async (strapi, entries, result) => {
  for (const { uid, data, locale, status } of entries) {
    if (!strapi.contentType(uid)) {
      throw fail(`Unknown content type "${uid}": scaffold it before boot.`);
    }
    const entry = await strapi.documents(uid).create({ data, locale, status });
    result.entries.push({ uid, id: entry.id, documentId: entry.documentId, locale: entry.locale });
  }
};

const seedApiTokens = async (strapi, tokens, result) => {
  for (const token of tokens) {
    const { name, description = '', kind = 'content-api' } = token;

    if (kind === 'content-api') {
      const { type = 'full-access', permissions = [] } = token;
      const created = await strapi.service('admin::api-token-content-api').create({
        name,
        description,
        type,
        lifespan: null,
        ...(type === 'custom' ? { permissions } : {}),
      });
      result.apiTokens.push({ id: created.id, name, kind, accessKey: created.accessKey });
      continue;
    }

    if (kind !== 'admin') {
      throw fail(`Unknown API token kind "${kind}".`);
    }
    // An admin token belongs to an admin user and cannot exceed that user's permissions.
    const owner = await strapi.db
      .query('admin::user')
      .findOne({ where: { email: token.owner }, populate: ['roles'] });
    if (!owner) {
      throw fail(`Admin token "${name}": no admin user "${token.owner}". Seed it first.`);
    }
    const created = await strapi
      .service('admin::api-token-admin')
      .create(
        { name, description, lifespan: null, adminPermissions: token.permissions ?? [] },
        owner
      );
    result.apiTokens.push({ id: created.id, name, kind, accessKey: created.accessKey });
  }
};

const STEPS = [
  ['locales', seedLocales],
  ['adminRoles', seedAdminRoles],
  ['adminUsers', seedAdminUsers],
  ['users', seedUsers],
  ['media', seedMedia],
  ['entries', seedEntries],
  ['apiTokens', seedApiTokens],
];

/** Apply a seed plan. Returns what was created, with ids, documentIds and token access keys. */
const runSeed = async (strapi, plan = {}) => {
  const unknown = Object.keys(plan).filter((key) => !STEPS.some(([step]) => step === key));
  if (unknown.length > 0) {
    throw fail(`Unknown seed steps: ${unknown.join(', ')}.`);
  }

  const result = Object.fromEntries(STEPS.map(([step]) => [step, []]));
  for (const [step, seed] of STEPS) {
    if (plan[step]?.length) {
      await seed(strapi, plan[step], result);
    }
  }
  return result;
};

module.exports = { runSeed };
