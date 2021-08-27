'use strict';

process.argv.splice(2, 1);

const { join } = require('path');
const { Plop, run } = require('plop');
const nodePlop = require('node-plop');

const execute = () => {
  Plop.launch({ configPath: join(__dirname, 'plopfile.js') }, env =>
    run({ ...env, dest: process.cwd() }, undefined, true)
  );
};

const generate = async (action, options, { dir = process.cwd() } = {}) => {
  const plop = nodePlop(join(__dirname, 'plopfile.js'), { destBasePath: dir });

  const generator = plop.getGenerator(action);
  await generator.runActions(options, {
    onSuccess: () => {},
    onFailure: () => {},
    onComment: () => {},
  });
};

module.exports = {
  generate,
  execute,
};
