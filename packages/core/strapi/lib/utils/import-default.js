'use strict';

const importDefault =
  (this && this.importDefault) ||
  function (modName) {
    const mod = require(modName);
    return mod && mod.__esModule ? mod.default : mod;
  };

module.exports = importDefault;
