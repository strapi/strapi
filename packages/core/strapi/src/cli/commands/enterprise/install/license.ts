import path from 'path';
import fse from 'fs-extra';
import { readLicense, verifyLicense } from '@strapi/core';

import { getInquirer } from '../../../utils/get-inquirer';
import type { Logger } from '../../../utils/logger';
import { BILLING_URL, LICENSE_FILE_NAME } from './constants';
import { EnterpriseInstallError } from './errors';

export type LicenseSource = 'environment' | 'license-file';

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
  environment: 'STRAPI_LICENSE',
  'license-file': LICENSE_FILE_NAME,
};

const cleanLicense = (value: string | undefined): string | undefined => value?.trim() || undefined;

/**
 * Looks for a license the way Strapi does: `STRAPI_LICENSE`, then `license.txt`. The command loads
 * the app's `.env` into the environment first, as `strapi build` does, so `STRAPI_LICENSE` covers
 * both the shell and `.env`, and the shell wins.
 */
export const findLicense = async ({
  appDir,
  env = process.env,
}: {
  appDir: string;
  env?: NodeJS.ProcessEnv;
}): Promise<FoundLicense | undefined> => {
  const licenseFromEnvironment = cleanLicense(env.STRAPI_LICENSE);
  if (licenseFromEnvironment) {
    return { license: licenseFromEnvironment, source: 'environment' };
  }

  let licenseFromLicenseFile: string | undefined;

  try {
    licenseFromLicenseFile = cleanLicense(readLicense(appDir));
  } catch {
    // A missing file reads as no license. Any other failure, such as no read permission, lands here.
    throw new EnterpriseInstallError(
      `Could not read ${LICENSE_FILE_NAME}. Check its permissions, or set STRAPI_LICENSE instead.`
    );
  }

  if (licenseFromLicenseFile) {
    return { license: licenseFromLicenseFile, source: 'license-file' };
  }

  return undefined;
};

/**
 * Checks the license signature with the same code Strapi uses, and rejects an expired license.
 * Nothing is written before this passes.
 */
export const validateLicense = (license: string, now: Date = new Date()): void => {
  let licenseInfo: ReturnType<typeof verifyLicense>;

  try {
    licenseInfo = verifyLicense(license);
  } catch {
    throw new EnterpriseInstallError(
      `This Strapi license is not valid. Check that you copied all of it, or find it at ${BILLING_URL}`
    );
  }

  // Typed as a string, but licenses store it as milliseconds. `new Date` reads both, as Strapi does.
  const expiresAt = licenseInfo.expireAt === undefined ? undefined : new Date(licenseInfo.expireAt);

  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < now.getTime()) {
    throw new EnterpriseInstallError(
      `This Strapi license expired on ${expiresAt.toISOString().slice(0, 10)}. Renew it at ${BILLING_URL}`
    );
  }
};

const promptForLicense = async (): Promise<string> => {
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
  await fse.writeFile(path.join(appDir, LICENSE_FILE_NAME), `${license}\n`, { mode: 0o600 });
  await ensureLicenseFileIsIgnored(appDir, logger);
};

/**
 * Returns a validated license. When none is found, asks for one in an interactive terminal and
 * saves it to `license.txt`, never to `.env`.
 */
export const resolveLicense = async ({
  appDir,
  isInteractive,
  logger,
  env = process.env,
  now = new Date(),
  prompt = promptForLicense,
}: {
  appDir: string;
  isInteractive: boolean;
  logger: Logger;
  env?: NodeJS.ProcessEnv;
  now?: Date;
  prompt?: () => Promise<string>;
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
