export * from './components/DefaultDocument';
export * from './render';

export type { Store } from './core/store/configure';
export type { SanitizedAdminUser } from '../../shared/contracts/shared';
export type { BulkActionComponent } from './core/apis/content-manager';
export type { CMAdminConfiguration } from './types/adminConfiguration';
export type { ListLayoutRow } from './content-manager/utils/layouts';

export { useDocument as unstable_useDocument } from './hooks/useDocument';
// TODO: Replace this export with the same hook exported from the @strapi/admin/strapi-admin/ee in another iteration of this solution
export { useLicenseLimits } from '../../ee/admin/src/hooks/useLicenseLimits';
