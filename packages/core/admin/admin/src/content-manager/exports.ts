/**
 * This file keeps track of the exports from the CM plugin admin side.
 * When we move the CM plugin back to its package, we won't need this
 * but should still export the same things.
 */

export { useDocument as unstable_useDocument } from './hooks/useDocument';
export { useDocumentActions as unstable_useDocumentActions } from './hooks/useDocumentActions';
export { useDocumentLayout as unstable_useDocumentLayout } from './hooks/useDocumentLayout';
export * from './components/Form';
