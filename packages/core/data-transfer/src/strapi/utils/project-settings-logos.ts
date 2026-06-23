import fp from 'lodash/fp.js';
import { readFile } from 'node:fs/promises';
import { join } from 'path';
import { Readable } from 'stream';
import { lookup as lookupMimeType } from 'mime-types';
import * as webStream from 'stream/web';
import type { Core } from '@strapi/types';

const { pick } = fp;

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
  mime?: string;
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

// The shape persisted back to core-store, matching what the admin project-settings
// service stores (so the admin UI keeps behaving identically after a transfer).
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

const getConfiguredUploadProvider = (strapi: Core.Strapi) =>
  (strapi.config.get('plugin::upload') as { provider?: string } | undefined)?.provider;

// Admin logos with no provider were uploaded with the local provider (the default).
const isLocalProviderLogo = (logo: ProjectSettingsLogo) =>
  !logo.provider || logo.provider === 'local';

// Best-effort mime type for a logo so that remote providers (S3, Cloudinary, …)
// store the correct Content-Type and the image renders instead of downloading.
// The admin does not persist the mime type, so it is reconstructed from the
// file extension (falling back to the file name).
const getLogoMimeType = (logo: ProjectSettingsLogo): string | undefined => {
  const fromExt = logo.ext ? lookupMimeType(logo.ext) : false;
  if (fromExt) {
    return fromExt;
  }

  const fromName = logo.name ? lookupMimeType(logo.name) : false;
  if (fromName) {
    return fromName;
  }

  return undefined;
};

/**
 * Resolve the URL to read a non-local logo from during export.
 *
 * Mirrors the media-library asset export: when the file lives on the
 * currently-configured provider and that provider serves private files,
 * a signed URL is generated so the bytes can be fetched.
 */
const getRemoteLogoUrl = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  const { provider } = strapi.plugins.upload;
  const providerName = getConfiguredUploadProvider(strapi);

  if (
    logo.provider === providerName &&
    typeof provider?.isPrivate === 'function' &&
    typeof provider?.getSignedUrl === 'function' &&
    (await provider.isPrivate())
  ) {
    const { url } = await provider.getSignedUrl(logo);
    return url;
  }

  return logo.url;
};

const logoLabel = (logo: ProjectSettingsLogo) => logo.name ?? logo.hash ?? 'unknown';

const readLocalLogoBuffer = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  const filepath = join(strapi.dirs.static.public, logo.url as string);

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
        `[Data transfer] Admin logo "${logoLabel(logo)}" exists in project settings but no corresponding file was found to transfer. Path: ${filepath}`
      );
      return undefined;
    }

    throw error;
  }
};

const readRemoteLogoBuffer = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  const url = await getRemoteLogoUrl(strapi, logo);
  const response = await strapi.fetch(url);

  if (response.status !== 200 || !response.body) {
    strapi.log.warn(
      `[Data transfer] Admin logo "${logoLabel(logo)}" exists in project settings but could not be fetched for transfer. URL: ${url} (status: ${response.status})`
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

const readLogoTransferBuffer = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  if (!logo.url) {
    return undefined;
  }

  if (isLocalProviderLogo(logo)) {
    return readLocalLogoBuffer(strapi, logo);
  }

  return readRemoteLogoBuffer(strapi, logo);
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

/**
 * Re-upload a transferred logo to the destination's configured upload provider.
 *
 * The file is always re-uploaded through the destination provider, so the
 * persisted `url` and `provider` reflect the destination (matching how the
 * media-library asset restore behaves). A best-effort mime type is supplied so
 * remote providers serve the logo with the correct Content-Type.
 */
const uploadLogoFromTransferBuffer = async (strapi: Core.Strapi, logo: ProjectSettingsLogo) => {
  if (!logo.__transferBuffer) {
    return logo;
  }

  const { __transferBuffer, ...logoWithoutBuffer } = logo;
  const provider = getConfiguredUploadProvider(strapi);
  const mime = getLogoMimeType(logoWithoutBuffer);

  const file = {
    ...logoWithoutBuffer,
    ...(mime ? { mime } : {}),
    stream: Readable.from(Buffer.from(__transferBuffer, 'base64')),
    provider,
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
