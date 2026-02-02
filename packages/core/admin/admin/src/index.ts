import { StrapiAppPlugin } from './StrapiApp';

/**
 * DO NOT REMOVE. This export is what's used to render the admin panel at all.
 * Without it === no admin panel.
 */
export * from './render';

/**
 * components
 */
export { BackButton, type BackButtonProps } from './features/BackButton';
export * from './components/ConfirmDialog';
export * from './components/Context';
export * from './components/DescriptionComponentRenderer';
export * from './components/Filters';
export * from './components/Form';
export * from './components/FormInputs/Renderer';
export * from './components/PageHelpers';
export * from './components/WidgetHelpers';
export * from './components/Pagination';
export * from './components/SearchInput';
export * from './components/Table';
export * from './components/ContentBox';
export * from './components/SubNav';
export * from './components/GradientBadge';

/** @internal */
export { tours } from './components/GuidedTour/Tours';
/** @internal */
export { useGuidedTour } from './components/GuidedTour/Context';
/** @internal */
export { GUIDED_TOUR_REQUIRED_ACTIONS } from './components/GuidedTour/utils/constants';

export {
  RESPONSIVE_DEFAULT_SPACING,
  HEIGHT_TOP_NAVIGATION,
  HEIGHT_TOP_NAVIGATION_MEDIUM,
  WIDTH_SIDE_NAVIGATION,
} from './constants/theme';

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
export { useHistory } from './features/BackButton';

/**
 * Hooks
 */
export { useInjectReducer } from './hooks/useInjectReducer';
export { useAPIErrorHandler } from './hooks/useAPIErrorHandler';
export { useQueryParams } from './hooks/useQueryParams';
export { useFetchClient } from './hooks/useFetchClient';
export { useFocusInputField } from './hooks/useFocusInputField';
export { useRBAC, type AllowedActions } from './hooks/useRBAC';
export { useClipboard } from './hooks/useClipboard';
export { useElementOnScreen } from './hooks/useElementOnScreen';
export { useDebounce } from './hooks/useDebounce';
export { useMediaQuery, useIsDesktop, useIsTablet, useIsMobile } from './hooks/useMediaQuery';
export { useDeviceType } from './hooks/useDeviceType';
export { usePersistentState } from './hooks/usePersistentState';
export { useAdminUsers } from './services/users';
export { useGetCountDocumentsQuery } from './services/homepage';

/**
 * Types
 */
export type { StrapiApp, InjectionZoneComponent } from './StrapiApp';
export type { Store } from './core/store/configure';
export type { Plugin, PluginConfig } from './core/apis/Plugin';
export type { MenuItem, StrapiAppSetting, StrapiAppSettingLink } from './core/apis/router';
export type {
  SanitizedAdminUser,
  AdminUser,
  SanitizedAdminRole,
  AdminRole,
  Entity,
  FieldContentSourceMap,
} from '../../shared/contracts/shared';
export type { RBACContext, RBACMiddleware } from './core/apis/rbac';
export type { WidgetWithUID as WidgetType, WidgetArgs } from './core/apis/Widgets';

/**
 * Utils
 */
export { translatedErrors } from './utils/translatedErrors';
export * from './utils/getFetchClient';
export * from './utils/baseQuery';
export * from './utils/rulesEngine';
export * from './services/api';
export type { CMAdminConfiguration } from './types/adminConfiguration';

/**
 * Components
 */

export { Layouts, type LayoutProps } from './components/Layouts/Layout';

export type PluginDefinition = StrapiAppPlugin;
