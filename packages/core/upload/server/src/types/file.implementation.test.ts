// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type apiUploadFolder from '../services/api-upload-folder';
import type file from '../services/file';
import type provider from '../services/provider';
import type { APIUploadFolderService, FileService, ProviderService } from './services';

// `satisfies` does not reject extra members: each implementation names exactly its contract's.
export type ImplementationNames = [
  Core.Assert<Core.SameNames<keyof typeof apiUploadFolder, keyof APIUploadFolderService>>,
  Core.Assert<Core.SameNames<keyof typeof file, keyof FileService>>,
  Core.Assert<Core.SameNames<keyof ReturnType<typeof provider>, keyof ProviderService>>,
];
