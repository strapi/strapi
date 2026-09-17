/**
 * Extension point: plugins whose state changes what the edit view renders —
 * without that state living in the URL — register a small hook here (e.g. a
 * delivery-channel switcher stored in localStorage). The joined key feeds the
 * edit-view layout waterfall's dependencies and the form's remount key, so a
 * change re-decorates the layout and remounts the inputs exactly like a
 * locale switch does.
 *
 * Registration happens during a plugin's `register(app)` / `bootstrap(app)`,
 * which always runs before the admin shell renders, so the source list is
 * fixed by first render and calling the hooks in registration order is safe
 * (same rationale as `navAddons.ts`).
 */

interface DocumentRenderContextSource {
  id: string;
  /** A React hook returning a small serializable string (e.g. the active variant's slug). */
  useValue: () => string;
}

const sources: DocumentRenderContextSource[] = [];

export const registerDocumentRenderContext = (source: DocumentRenderContextSource) => {
  const index = sources.findIndex((item) => item.id === source.id);
  if (index === -1) {
    sources.push(source);
  } else {
    sources[index] = source;
  }
};

/**
 * Joined `id=value` pairs of every registered source; `''` when none is
 * registered. The source list is frozen before first render, so the hook
 * order is stable across renders.
 */
export const useDocumentRenderKey = (): string =>
  sources
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-size registry, see above
    .map((source) => `${source.id}=${source.useValue()}`)
    .join('&');

export type { DocumentRenderContextSource };
