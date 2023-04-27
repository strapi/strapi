/* eslint-disable @typescript-eslint/no-var-requires */

export = function importDefault(modName) {
  const mod = require(modName);
  return mod && mod.__esModule ? mod.default : mod;
};
