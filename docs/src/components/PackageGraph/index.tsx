import { lazy, Suspense, type ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

import styles from './styles.module.css';

// React Flow needs the DOM: load it on the client only, in its own chunk.
const GraphExplorer = lazy(() => import('./GraphExplorer'));

function GraphFallback(): ReactNode {
  return (
    <div className={styles.fallback} role="status">
      <p>Loading the package map…</p>
      <p className={styles.fallbackHint}>The table below lists the same packages.</p>
    </div>
  );
}

/** Interactive map of the workspace packages and their internal dependencies. */
export default function PackageGraph(): ReactNode {
  return (
    <BrowserOnly fallback={<GraphFallback />}>
      {() => (
        <Suspense fallback={<GraphFallback />}>
          <GraphExplorer />
        </Suspense>
      )}
    </BrowserOnly>
  );
}
