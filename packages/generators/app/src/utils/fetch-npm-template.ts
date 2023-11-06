import path from 'path';
import execa from 'execa';
import chalk from 'chalk';
import type { PackageInfo } from '../types';

// Gets the package version on npm. Will fail if the package does not exist
async function getPackageInfo(packageName: string): Promise<PackageInfo> {
  const { stdout } = await execa('npm', ['view', packageName, 'name', 'version', '--silent']);
  // Use regex to parse name and version from CLI result
  const match = stdout.match(/(?<=')(.*?)(?=')/gm);

  if (!match) {
    throw new Error('Could not match');
  }

  const [name, version] = match;
  return { name, version };
}

export async function getTemplatePackageInfo(template: string): Promise<PackageInfo> {
  // Check if template is a shorthand
  try {
    const longhand = `@strapi/template-${template}`;
    const packageInfo = await getPackageInfo(longhand);
    // Hasn't crashed so it is indeed a shorthand
    return packageInfo;
  } catch (error) {
    // Ignore error, we now know it's not a shorthand
  }
  // Fetch version of the non-shorthand package
  try {
    return await getPackageInfo(template);
  } catch (error) {
    throw new Error(`Could not find package ${chalk.yellow(template)} on npm`);
  }
}

export async function downloadNpmTemplate({ name, version }: PackageInfo, parentDir: string) {
  // Download from npm
  await execa('npm', ['install', `${name}@${version}`, '--no-save', '--silent'], {
    cwd: parentDir,
  });

  // Return the path of the actual template
  const exactTemplatePath = path.dirname(
    require.resolve(`${name}/package.json`, { paths: [parentDir] })
  );

  return exactTemplatePath;
}
