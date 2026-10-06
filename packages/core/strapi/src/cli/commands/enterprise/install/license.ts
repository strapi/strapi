import path from 'node:path';
import fse from 'fs-extra';
import dotenv from 'dotenv';

import { getInquirer } from '../../../utils/get-inquirer';
import type { Logger } from '../../../utils/logger';
import { BILLING_URL, LICENSE_FILE_NAME } from './constants';
import { EnterpriseInstallError } from './errors';

export type LicenseSource = 'environment' | 'env-file' | 'license-file';

export interface FoundLicense {
  license: string;
  source: LicenseSource;
}

export interface ResolvedLicense {
  license: string;
  /** `prompt` when the user pasted it, which also saved it to license.txt. */
  source: LicenseSource | 'prompt';
}

const LICENSE_SOURCE_LABELS: Record<LicenseSource, string> = {
  environment: 'the STRAPI_LICENSE environment variable',
  'env-file': 'STRAPI_LICENSE in .env',
  'license-file': LICENSE_FILE_NAME,
};

const cleanLicense = (value: string | undefined): string | undefined => value?.trim() || undefined;

const readLicenseFile = async (appDir: string): Promise<string | undefined> => {
  try {
    return await fse.readFile(path.join(appDir, LICENSE_FILE_NAME), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
};

interface LicenseInfo {
  expireAt?: string | number;
}

const readLicenseInfo = (license: string): LicenseInfo => {
  const [signature, base64Content] = Buffer.from(license, 'base64').toString().split('\n');

  if (!signature || !base64Content) {
    throw new Error('Invalid license.');
  }

  const licenseInfo: unknown = JSON.parse(Buffer.from(base64Content, 'base64').toString());

  if (typeof licenseInfo !== 'object' || licenseInfo === null) {
    throw new Error('Invalid license.');
  }

  return licenseInfo as LicenseInfo;
};

const readEnvFileLicense = async (
  appDir: string,
  env: NodeJS.ProcessEnv
): Promise<string | undefined> => {
  const envFilePath = env.ENV_PATH ? path.resolve(appDir, env.ENV_PATH) : path.join(appDir, '.env');

  if (!(await fse.pathExists(envFilePath))) {
    return undefined;
  }

  return cleanLicense(dotenv.parse(await fse.readFile(envFilePath)).STRAPI_LICENSE);
};

export const findLicense = async ({
  appDir,
  env,
}: {
  appDir: string;
  env: NodeJS.ProcessEnv;
}): Promise<FoundLicense | undefined> => {
  const licenseFromEnvironment = cleanLicense(env.STRAPI_LICENSE);
  if (licenseFromEnvironment) {
    const isFromEnvFile = (await readEnvFileLicense(appDir, env)) === licenseFromEnvironment;

    return { license: licenseFromEnvironment, source: isFromEnvFile ? 'env-file' : 'environment' };
  }

  let licenseFromLicenseFile: string | undefined;

  try {
    licenseFromLicenseFile = cleanLicense(await readLicenseFile(appDir));
  } catch {
    throw new EnterpriseInstallError(
      `Could not read ${LICENSE_FILE_NAME}. Check its permissions, or set STRAPI_LICENSE instead.`
    );
  }

  if (licenseFromLicenseFile) {
    return { license: licenseFromLicenseFile, source: 'license-file' };
  }

  return undefined;
};

export const validateLicense = (license: string, now: Date): void => {
  let licenseInfo: LicenseInfo;

  try {
    licenseInfo = readLicenseInfo(license);
  } catch {
    throw new EnterpriseInstallError(
      `This Strapi license is not valid. Check that you copied all of it, or find it at ${BILLING_URL}`
    );
  }

  const expiresAt = licenseInfo.expireAt === undefined ? undefined : new Date(licenseInfo.expireAt);

  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < now.getTime()) {
    throw new EnterpriseInstallError(
      `This Strapi license expired on ${expiresAt.toISOString().slice(0, 10)}. Renew it at ${BILLING_URL}`
    );
  }
};

export const promptForLicense = async (): Promise<string> => {
  const inquirer = await getInquirer();
  const { license } = await inquirer.prompt<{ license: string }>([
    {
      type: 'password',
      name: 'license',
      message: 'Strapi license?',
      validate: (value: string) => value.trim().length > 0 || 'The license cannot be empty.',
    },
  ]);

  return license.trim();
};

const isLicenseFileIgnored = (gitignoreContent: string): boolean =>
  gitignoreContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === LICENSE_FILE_NAME || line === `/${LICENSE_FILE_NAME}`);

const ensureLicenseFileIsIgnored = async (appDir: string, logger: Logger): Promise<void> => {
  const gitignorePath = path.join(appDir, '.gitignore');
  const gitignoreContent = (await fse.pathExists(gitignorePath))
    ? await fse.readFile(gitignorePath, 'utf8')
    : '';

  if (isLicenseFileIgnored(gitignoreContent)) {
    return;
  }

  const separator = gitignoreContent.length > 0 && !gitignoreContent.endsWith('\n') ? '\n' : '';
  await fse.writeFile(gitignorePath, `${gitignoreContent}${separator}${LICENSE_FILE_NAME}\n`);
  logger.info(`Added ${LICENSE_FILE_NAME} to .gitignore so the license is not committed.`);
};

export const saveLicenseFile = async (
  appDir: string,
  license: string,
  logger: Logger
): Promise<void> => {
  const licenseFilePath = path.join(appDir, LICENSE_FILE_NAME);

  await fse.writeFile(licenseFilePath, `${license}\n`);
  // Also restricts a license.txt that already existed, empty, with wider permissions.
  await fse.chmod(licenseFilePath, 0o600);
  await ensureLicenseFileIsIgnored(appDir, logger);
};

export const resolveLicense = async ({
  appDir,
  isInteractive,
  logger,
  env,
  now,
  prompt,
}: {
  appDir: string;
  isInteractive: boolean;
  logger: Logger;
  env: NodeJS.ProcessEnv;
  now: Date;
  prompt: () => Promise<string>;
}): Promise<ResolvedLicense> => {
  const foundLicense = await findLicense({ appDir, env });

  if (foundLicense) {
    validateLicense(foundLicense.license, now);
    logger.info(`Using the Strapi license from ${LICENSE_SOURCE_LABELS[foundLicense.source]}.`);

    return foundLicense;
  }

  if (!isInteractive) {
    throw new EnterpriseInstallError(
      'No Strapi license found. Set STRAPI_LICENSE, or run the command in a terminal to paste it.'
    );
  }

  logger.info(`No Strapi license found. You can find yours at ${BILLING_URL}`);

  const pastedLicense = await prompt();
  validateLicense(pastedLicense, now);
  await saveLicenseFile(appDir, pastedLicense, logger);
  logger.success(`Saved the license to ${LICENSE_FILE_NAME}.`);

  return { license: pastedLicense, source: 'prompt' };
};
