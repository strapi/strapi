'use strict';
const tsUtils = require('@strapi/typescript-utils')
const strapi = require('../index');

/**
 * `$ strapi start`
 */
module.exports = async specifiedDir => {
    const appDir = process.cwd();
    const isTSProject = await tsUtils.isUsingTypeScript(appDir)
    const compiledDirectoryPath = isTSProject ? tsUtils.resolveConfigOptions(`${appDir}/tsconfig.json`).options?.outDir : null
    const distDir = isTSProject && !specifiedDir ? compiledDirectoryPath : specifiedDir;

    strapi({ distDir }).start()
};
