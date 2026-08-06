/**
 * Admin-side previewScript stub.
 *
 * This function mirrors the blocks-forwarding behaviour of the server-side
 * previewScript: when it receives a `strapiFieldChange` message whose value
 * looks like a blocks AST, it re-dispatches the payload as a CustomEvent so
 * host-app components (e.g. BlocksRenderer) can subscribe and re-render
 * without the script patching the DOM directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function previewScript(_config: unknown): void {
  // Inlined so the constant survives toString()+eval() with no closure.
  const STRAPI_FIELD_CHANGE = 'strapiFieldChange';

  const isBlocksValue = (value: unknown): boolean => {
    if (!Array.isArray(value) || value.length === 0) return false;
    return (value as unknown[]).every(
      (n) =>
        n !== null &&
        typeof n === 'object' &&
        'type' in (n as object) &&
        'children' in (n as object) &&
        Array.isArray((n as Record<string, unknown>).children)
    );
  };

  const handler = (event: MessageEvent) => {
    if (!event.data?.type) return;
    if (event.data.type !== STRAPI_FIELD_CHANGE) return;
    const payload = (event.data.payload ?? {}) as Record<string, unknown>;
    const field = payload.field;
    const value = payload.value;
    if (!field || !isBlocksValue(value)) return;
    window.dispatchEvent(new CustomEvent(STRAPI_FIELD_CHANGE, { detail: { field, value } }));
  };

  window.addEventListener('message', handler);

  (window as unknown as Record<string, unknown>).__strapi_previewCleanup = () => {
    window.removeEventListener('message', handler);
    delete (window as unknown as Record<string, unknown>).__strapi_previewCleanup;
  };
}
