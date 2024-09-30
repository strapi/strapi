import type { modules } from '../../../dist';
import { upgradeIfExists } from '../../utils/upgrade-package';

const DEP_NAME = 'better-sqlite3';
const DEP_PATH = `dependencies.${DEP_NAME}`;
const DEP_VERSION = '11.3.0';

/**
 *
 */
const transform: modules.runner.json.JSONTransform = (file, params) => {
  return upgradeIfExists(file, params, DEP_PATH, DEP_VERSION);
};

export default transform;
