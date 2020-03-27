'use strict';

const isTruthyEnvVar = val => {
  if (val === null || val === undefined) return false;

  if (val === true) return true;

  if (val.toString().toLowerCase() === 'true') return true;
  if (val.toString().toLowerCase() === 'false') return false;

  if (val === 1) return true;

  return false;
};

module.exports = isTruthyEnvVar;
