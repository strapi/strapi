/* eslint-disable @typescript-eslint/no-var-requires */

export default function importDefault(modName: string) {
  const mod = require(modName);
  return mod && mod.__esModule ? mod.default : mod;
}
