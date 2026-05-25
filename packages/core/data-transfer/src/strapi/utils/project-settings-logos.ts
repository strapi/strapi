import { join } from 'path';
import { Readable } from 'stream';
import { pick } from 'lodash/fp';
import { readFile } from 'fs-extra';
import * as webStream from 'stream/web';
import type { Core } from '@strapi/types';

export const PROJECT_SETTINGS_CORE_STORE_KEY = 'core_admin_project-settings';

export const PROJECT_SETTINGS_LOGO_FIELDS = ['menuLogo', 'authLogo'] as const;

export type ProjectSettingsLogoField = (typeof PROJECT_SETTINGS_LOGO_FIELDS)[number];

export type ProjectSettingsLogo = {
  name?: string;
  hash?: string;
  url?: string;
  width?: number;
  height?: number;
  ext?: string;
  size?: number;
  provider?: string;
  __transferBuffer?: string;
};

export type ProjectSettingsStoreValue = {
  menuLogo?: ProjectSettingsLogo | null;
  authLogo?: ProjectSettingsLogo | null;
};

export type CoreStoreRow = {
  key: string;
  value: unknown;
  [key: string]: unknown;
};

const LOGO_PERSISTED_FIELDS = [
  'name',
  'hash',
  'url',
  'width',
  'height',
  'ext',
  'size',
  'provider',
] as const;

const isProjectSettingsRow = (row: CoreStoreRow) => row.key === PROJECT_SETTINGS_CORE_STORE_KEY;

const isLocalProvider = (logo: ProjectSettingsLogo) => !logo.provider || logo.provider === 'local';

const getLogoFilePath = (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  if (!logo.url) {
    return null;
  }

  if (isLocalProvider(logo)) {
    return join(strapi.dirs.static.public, logo.url);
  }

  return logo.url;
};

const readLogoTransferBuffer = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  const filepath = getLogoFilePath(strapi, logo);

  if (!filepath) {
    return undefined;
  }

  if (isLocalProvider(logo)) {
    try {
      const buffer = await readFile(filepath);
      return buffer.toString('base64');
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? (error as NodeJS.ErrnoException).code
          : undefined;

      if (code === 'ENOENT') {
        strapi.log.warn(
          `[Data transfer] Admin logo "${logo.name ?? logo.hash ?? 'unknown'}" exists in project settings but no corresponding file was found to transfer. Path: ${filepath}`
        );
        return undefined;
      }

      throw error;
    }
  }

  const response = await strapi.fetch(filepath);

  if (response.status !== 200 || !response.body) {
    strapi.log.warn(
      `[Data transfer] Admin logo "${logo.name ?? logo.hash ?? 'unknown'}" exists in project settings but could not be fetched for transfer. URL: ${filepath} (status: ${response.status})`
    );
    return undefined;
  }

  const chunks: Uint8Array[] = [];

  for await (const chunk of Readable.fromWeb(
    response.body as webStream.ReadableStream<Uint8Array>
  )) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('base64');
};

const enrichLogoForExport = async (
  strapi: Core.Strapi,
  logo: ProjectSettingsLogo | null | undefined
) => {
  if (!logo?.url) {
    return logo;
  }

  const transferBuffer = await readLogoTransferBuffer(strapi, logo);

  if (!transferBuffer) {
    return logo;
  }

  return {
    ...logo,
    __transferBuffer: transferBuffer,
  };
};

export const enrichProjectSettingsForExport = async (
  strapi: Core.Strapi,
  row: CoreStoreRow
): Promise<CoreStoreRow> => {
  if (!isProjectSettingsRow(row)) {
    return row;
  }

  const settings = row.value as ProjectSettingsStoreValue;

  const [menuLogo, authLogo] = await Promise.all([
    enrichLogoForExport(strapi, settings.menuLogo),
    enrichLogoForExport(strapi, settings.authLogo),
  ]);

  return {
    ...row,
    value: {
      ...settings,
      menuLogo,
      authLogo,
    },
  };
};

const uploadLogoFromTransferBuffer = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  if (!logo.__transferBuffer) {
    return logo;
  }

  const { __transferBuffer, ...logoWithoutBuffer } = logo;
  const file = {
    ...logoWithoutBuffer,
    stream: Readable.from(Buffer.from(__transferBuffer, 'base64')),
    provider:
      logoWithoutBuffer.provider ??
      (strapi.config.get('plugin::upload') as { provider: string }).provider,
  };

  await strapi.plugin('upload').provider.uploadStream(file);

  return pick(LOGO_PERSISTED_FIELDS, file);
};

export const restoreProjectSettingsLogos = async (
  strapi: Core.Strapi,
  settings: ProjectSettingsStoreValue
): Promise<ProjectSettingsStoreValue> => {
  const [menuLogo, authLogo] = await Promise.all([
    settings.menuLogo ? uploadLogoFromTransferBuffer(strapi, settings.menuLogo) : settings.menuLogo,
    settings.authLogo ? uploadLogoFromTransferBuffer(strapi, settings.authLogo) : settings.authLogo,
  ]);

  return {
    ...settings,
    menuLogo,
    authLogo,
  };
};

export const restoreProjectSettingsRow = async (strapi: Core.Strapi, row: CoreStoreRow) => {
  if (!isProjectSettingsRow(row)) {
    return row;
  }

  return {
    ...row,
    value: await restoreProjectSettingsLogos(strapi, row.value as ProjectSettingsStoreValue),
  };
};
