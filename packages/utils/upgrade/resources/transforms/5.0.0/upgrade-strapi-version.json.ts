import path from 'node:path';
import type { JSONTransform } from '@strapi/upgrade';

/**
 * Note: This transform file is only for development purposes and should be deleted before releasing
 */

const transform: JSONTransform = (file, api) => {
  const packageJsonPath = path.join(api.cwd, 'package.json');

  // Ignore files that are not the root package.json
  // Note: We could also find every file named package.json and update the dependencies for all of them
  if (file.path !== packageJsonPath) {
    return file.source;
  }

  const content = api.parse(file.source);

  if ('@strapi/strapi' in content.dependencies) {
    content.dependencies['@strapi/strapi'] = '5.0.0';
  }

  return api.toSource(content);
};

export default transform;
