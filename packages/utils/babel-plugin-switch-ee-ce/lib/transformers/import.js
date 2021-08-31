'use strict';

const template = require('@babel/template').default;
const resolvePath = require('../resolvePath');

module.exports = function transformImport(nodePath, state) {
  if (state.moduleResolverVisited.has(nodePath)) {
    return;
  }
  state.moduleResolverVisited.add(nodePath);

  const source = nodePath.get('source').node.value;

  const currentFile = state.file.opts.filename;

  if (source.includes('ee_else_ce')) {
    const modulePaths = resolvePath(source, currentFile, state.opts);
    const specifiers = nodePath.node.specifiers.map(s => ` ${s.local.name}`);

    const tmpNode = `const ${specifiers[0]} = (() => {
        if (window && window.strapi && window.strapi.isEE) {
          return require('${modulePaths.relativeEEPath}').default;
        }

        return require('${modulePaths.relativeCEPath}').default;
      })();`;

    nodePath.replaceWith(template.statement.ast(tmpNode));
  }
};
