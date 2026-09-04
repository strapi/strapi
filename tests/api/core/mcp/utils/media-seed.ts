import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Core } from '@strapi/types';

const FILE_MODEL_UID = 'plugin::upload.file';
const FOLDER_MODEL_UID = 'plugin::upload.folder';

/** Fixture assets already committed for the upload api tests. */
const FIXTURES_DIR = path.join(__dirname, '../../upload/utils');

export type SeededFolder = {
  id: number;
  name: string;
  path: string;
  pathId: number;
};

export type SeededAsset = {
  id: number;
  name: string;
  mime: string;
  url: string;
  folder?: { id: number } | null;
};

export type SeedAssetOptions = {
  /** Fixture file name inside `tests/api/core/upload/utils` (default: `strapi.jpg`). */
  fixture?: string;
  /** Stored asset name; defaults to the fixture's own file name. */
  name?: string;
  /** Containing folder id. Omit for an asset at the media library root. */
  folderId?: number | null;
  alternativeText?: string;
  caption?: string;
};

/**
 * Seeding helpers for Media Library api tests.
 *
 * These go through the real upload and folder **services** rather than the HTTP API, because
 * media assets cannot be fixtured with `createTestBuilder().addContentType()` the way
 * content-manager tests fixture documents: a media asset is a provider-backed file plus a row,
 * not just a row. Seeding through the service exercises the same code path the admin API uses,
 * so the resulting rows carry a real `hash`, `url`, `provider`, and `folderPath`.
 *
 * Shared by every Media Library MCP api test (read tools, folder CRUD, move, metadata).
 */
export const createMediaSeeder = (strapi: Core.Strapi) => {
  const uploadService = () => strapi.plugin('upload').service('upload');
  const folderService = () => strapi.plugin('upload').service('folder');

  /**
   * Creates a media folder. `parentId` nests it under an existing folder.
   * The folder service computes `path` / `pathId`, so subsequent asset seeding resolves correctly.
   */
  const seedFolder = async (
    name: string,
    parentId: number | null = null
  ): Promise<SeededFolder> => {
    const folder = await folderService().create({ name, parent: parentId });
    return folder as SeededFolder;
  };

  /**
   * Uploads a real fixture file through the upload service and returns the persisted row.
   *
   * The fixture is copied to a temp directory first: the upload pipeline moves/consumes the file
   * it is handed, and a committed fixture must survive the test run.
   */
  const seedAsset = async (options: SeedAssetOptions = {}): Promise<SeededAsset> => {
    const { fixture = 'strapi.jpg', name, folderId, alternativeText, caption } = options;

    const source = path.join(FIXTURES_DIR, fixture);
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'strapi-mcp-media-'));
    const filepath = path.join(tmpDir, fixture);
    await fs.promises.copyFile(source, filepath);

    const { size } = await fs.promises.stat(filepath);
    const originalFilename = name ?? fixture;

    const fileInfo: Record<string, unknown> = {};
    if (alternativeText !== undefined) fileInfo.alternativeText = alternativeText;
    if (caption !== undefined) fileInfo.caption = caption;
    if (name !== undefined) fileInfo.name = name;

    const data: Record<string, unknown> = { fileInfo };
    if (folderId !== undefined && folderId !== null) {
      data.fileInfo = { ...fileInfo, folder: folderId };
    }

    const [uploaded] = await uploadService().upload({
      data,
      files: [
        {
          filepath,
          originalFilename,
          mimetype: mimeForFixture(fixture),
          size,
        },
      ],
    });

    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    return uploaded as SeededAsset;
  };

  /**
   * Removes every seeded asset and folder.
   *
   * Deletes rows directly instead of calling `upload.remove()`: the goal is a clean database
   * between tests, and a provider delete that fails on a missing file must not fail teardown.
   */
  const cleanup = async (): Promise<void> => {
    await strapi.db.query(FILE_MODEL_UID).deleteMany({});
    await strapi.db.query(FOLDER_MODEL_UID).deleteMany({});
  };

  return { seedFolder, seedAsset, cleanup };
};

/** Minimal fixture-name → mime mapping for the committed upload test fixtures. */
const mimeForFixture = (fixture: string): string => {
  const byExt: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.tiff': 'image/tiff',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.bin': 'application/octet-stream',
  };

  return byExt[path.extname(fixture).toLowerCase()] ?? 'application/octet-stream';
};
