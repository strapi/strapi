/**
 * DO NOT REMOVE. This export is whats used to render the admin panel at all.
 * Without it === no admin panel.
 */
export * from './render';

/**
 * components
 */
export { BackButton, type BackButtonProps } from './features/BackButton';
export * from './components/ConfirmDialog';
export * from './components/Form';
export * from './components/FormInputs/Renderer';
export * from './components/PageHelpers';
export * from './components/Pagination';
export * from './components/SearchInput';
export * from './components/Table';

export { useGuidedTour } from './components/GuidedTour/Provider';

/**
 * Features
 */
export { useTracking, type TrackingEvent } from './features/Tracking';
export { useStrapiApp, type StrapiAppContextValue } from './features/StrapiApp';
export {
  useNotification,
  type NotificationsContextValue,
  type NotificationConfig,
  NotificationsProvider,
} from './features/Notifications';
export { useAppInfo, type AppInfoContextValue } from './features/AppInfo';
export { type Permission, useAuth, type AuthContextValue } from './features/Auth';

/**
 * Hooks
 */
export { useInjectReducer } from './hooks/useInjectReducer';
// TODO: Replace this export with the same hook exported from the @strapi/admin/strapi-admin/ee in another iteration of this solution
export { useLicenseLimits } from '../../ee/admin/src/hooks/useLicenseLimits';
export { useAPIErrorHandler, type ApiError } from './hooks/useAPIErrorHandler';
export { useQueryParams } from './hooks/useQueryParams';
export { useFetchClient } from './hooks/useFetchClient';
export { useRBAC } from './hooks/useRBAC';

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

/**
 * Utils
 */
export { translatedErrors } from './utils/translatedErrors';
export { getFetchClient } from './utils/getFetchClient';

export * from './content-manager/exports';
