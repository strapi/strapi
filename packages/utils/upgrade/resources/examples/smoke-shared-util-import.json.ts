import type { modules } from '../../dist';
import { JSON_SMOKE_MARKER } from '../utils/json-smoke';

/** Smoke JSON transform that imports a shared util under resources/utils. Not a production codemod. */
const transform: modules.runner.json.JSONTransform = (file) => {
  if (JSON_SMOKE_MARKER !== 'json-codemod-utils-ok') {
    throw new Error('Unexpected smoke marker');
  }

  return file.json;
};

export default transform;
