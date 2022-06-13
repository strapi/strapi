'use strict';
let requirePackage = require;
let adminAliases = {};
try {
  const pnpapi = require('pnpapi');
  const { createRequire } = require(`module`);
  const adminPackage = pnpapi.resolveToUnqualified('@strapi/admin', require.resolve('@strapi/strapi'))
  adminAliases = {
    'font-awesome': pnpapi.resolveToUnqualified('font-awesome', adminPackage),
    '@strapi/icons': pnpapi.resolveToUnqualified('@strapi/icons', adminPackage),
    lodash: pnpapi.resolveToUnqualified('lodash', adminPackage),
    'highlight.js': pnpapi.resolveToUnqualified('highlight.js', adminPackage),
    'date-fns': pnpapi.resolveToUnqualified('date-fns', adminPackage),
    codemirror: pnpapi.resolveToUnqualified('codemirror', adminPackage),
    '@fortawesome/fontawesome-free': pnpapi.resolveToUnqualified(
      '@fortawesome/fontawesome-free',
      adminPackage
    ),
    cropperjs: pnpapi.resolveToUnqualified('cropperjs', adminPackage),
  };
  requirePackage = createRequire(pnpapi.resolveToUnqualified('@strapi/admin', '@strapi/strapi'));
} catch {
  requirePackage = require;
  adminAliases = {};
}

module.exports = {
  requirePackage,
  adminAliases,
};
