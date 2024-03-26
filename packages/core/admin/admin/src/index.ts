export * from './components/DefaultDocument';
export * from './render';

export type { Store } from './core/store/configure';
export type { SanitizedAdminUser } from '../../shared/contracts/shared';

export { useDocument as unstable_useDocument } from './hooks/useDocument';
// TODO: Replace this export with the same hook exported from the @strapi/admin/strapi-admin/ee in another iteration of this solution
export { useLicenseLimits } from '../../ee/admin/src/hooks/useLicenseLimits';
