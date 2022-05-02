'use strict';
const tsUtils = require('@strapi/typescript-utils')
const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = async specifiedDir => {
    const appDir = process.cwd();
    const isTSProject = await tsUtils.isUsingTypeScript(appDir)
    const distDir = isTSProject && !specifiedDir ? 'dist' : specifiedDir;

    strapi({ distDir }).start()
};
