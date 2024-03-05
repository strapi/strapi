/**
 * DO NOT REMOVE. This export is whats used to render the admin panel at all.
 * Without it === no admin panel.
 */
export * from './render';

/**
 * components
 */
export * from './components/Form';
export * from './components/FormInputs/Renderer';

/**
 * Hooks
 */
export { useInjectReducer } from './hooks/useInjectReducer';
// TODO: Replace this export with the same hook exported from the @strapi/admin/strapi-admin/ee in another iteration of this solution
export { useLicenseLimits } from '../../ee/admin/src/hooks/useLicenseLimits';

/**
 * Types
 */
export type { Store } from './core/store/configure';
export type { SanitizedAdminUser } from '../../shared/contracts/shared';
export type {
  Context,
  DescriptionComponent,
  DescriptionReducer,
  PanelComponentProps,
  PanelComponent,
  PanelDescription,
  DocumentActionComponent,
  DocumentActionDescription,
  DocumentActionProps,
  HeaderActionComponent,
  HeaderActionDescription,
  HeaderActionProps,
} from './core/apis/content-manager';

export * from './content-manager/exports';
