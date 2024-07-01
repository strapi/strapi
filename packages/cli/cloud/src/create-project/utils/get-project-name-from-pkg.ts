import { CLIContext } from '../../types';
import { PackageJson, loadPkg } from '../../utils/pkg';

export async function getProjectNameFromPackageJson(ctx: CLIContext): Promise<string> {
  try {
    const packageJson = (await loadPkg(ctx)) as PackageJson;
    return packageJson.name || 'my-strapi-project';
  } catch (e) {
    return 'my-strapi-project';
  }
}
