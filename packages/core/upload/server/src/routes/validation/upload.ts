import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

export type FileQueryParam = 'fields' | 'populate' | 'sort' | 'pagination' | 'filters';

export class UploadRouteValidator {
  protected readonly _strapi: Core.Strapi;

  public constructor(strapi: Core.Strapi) {
    this._strapi = strapi;
  }

  get file() {
    return z.object({
      id: this.fileId,
      documentId: z.uuid(),
      name: z.string(),
      alternativeText: z.string().nullable().optional(),
      caption: z.string().nullable().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
      formats: z.record(z.string(), z.unknown()).optional(),
      hash: z.string(),
      ext: z.string().optional(),
      mime: z.string(),
      size: z.number(),
      url: z.string(),
      previewUrl: z.string().nullable().optional(),
      folder: z.number().optional(),
      folderPath: z.string(),
      provider: z.string(),
      provider_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      createdBy: z.number().optional(),
      updatedBy: z.number().optional(),
    });
  }

  get files() {
    return z.array(this.file);
  }

  get fileId() {
    return z.number().int().positive();
  }
}
