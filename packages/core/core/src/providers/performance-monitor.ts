import type { Core } from '@strapi/types';

import { defineProvider } from './provider';
import {
  attachPerformanceArtifactWriter,
  type PerformanceArtifactDisposed,
} from '../services/performance';

const artifactDisposers = new WeakMap<Core.Strapi, PerformanceArtifactDisposed>();
const liveMetricsDisposers = new WeakMap<Core.Strapi, () => void>();

export default defineProvider({
  async register(strapi) {
    artifactDisposers.set(strapi, attachPerformanceArtifactWriter(strapi));

    // Eagerly resolve the live aggregator so it subscribes to the hub from startup, rather than
    // lazily on the first admin widget request (which would miss earlier traffic).
    const liveMetrics = strapi.performanceMetrics;
    liveMetricsDisposers.set(strapi, () => liveMetrics.dispose());
  },

  async destroy(strapi) {
    const disposeArtifact = artifactDisposers.get(strapi);
    artifactDisposers.delete(strapi);
    await disposeArtifact?.();

    const disposeLive = liveMetricsDisposers.get(strapi);
    liveMetricsDisposers.delete(strapi);
    disposeLive?.();
  },
});
