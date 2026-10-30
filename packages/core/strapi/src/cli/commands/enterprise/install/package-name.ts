import { ENTERPRISE_SCOPE } from './constants';

const ENTERPRISE_PACKAGE_NAME = new RegExp(`^${ENTERPRISE_SCOPE}/[a-z0-9-][a-z0-9._-]*$`);
const MAX_PACKAGE_NAME_LENGTH = 214;

export const isValidPackageName = (packageName: string) =>
  packageName.length <= MAX_PACKAGE_NAME_LENGTH && ENTERPRISE_PACKAGE_NAME.test(packageName);
