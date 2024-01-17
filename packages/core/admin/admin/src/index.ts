export * from './components/DefaultDocument';
export * from './render';

export type { Store } from './core/store/configure';
export type { SanitizedAdminUser } from '../../shared/contracts/shared';

export { useDocument as unstable_useDocument } from './hooks/useDocument';
