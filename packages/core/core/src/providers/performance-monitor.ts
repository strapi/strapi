import type { Core } from '@strapi/types';

import { defineProvider } from './provider';
import {
  attachPerformanceArtifactWriter,
  type PerformanceArtifactDisposed,
} from '../services/performance-artifact';

const artifactDisposers = new WeakMap<Core.Strapi, PerformanceArtifactDisposed>();

export default defineProvider({
  async register(strapi) {
    artifactDisposers.set(strapi, attachPerformanceArtifactWriter(strapi));
  },

  async destroy(strapi) {
    const dispose = artifactDisposers.get(strapi);
    artifactDisposers.delete(strapi);
    await dispose?.();
  },
});
