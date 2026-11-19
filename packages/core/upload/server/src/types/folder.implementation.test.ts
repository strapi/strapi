// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type folder from '../services/folder';
import type { FolderService } from './services';

// The folder service implements every member of its contract, and nothing else.
export type FolderImplementationAssertions = [
  Core.Assert<Core.SameNames<keyof typeof folder, keyof FolderService>>,
];
