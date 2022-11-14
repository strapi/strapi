import { getType, getOtherInfos } from './content-manager/utils/getAttributeInfos';

// Contexts
export { default as AppInfosContext } from './contexts/AppInfosContext';
export { default as AutoReloadOverlayBockerContext } from './contexts/AutoReloadOverlayBockerContext';
export { default as NotificationsContext } from './contexts/NotificationsContext';
export { default as OverlayBlockerContext } from './contexts/OverlayBlockerContext';

export { default as RBACProviderContext } from './contexts/RBACProviderContext';
export { default as TrackingContext } from './contexts/TrackingContext';

// Hooks
export { default as useGuidedTour } from './hooks/useGuidedTour';
export { default as useAppInfos } from './hooks/useAppInfos';

export { default as useQuery } from './hooks/useQuery';
export { default as useLibrary } from './hooks/useLibrary';
export { default as useCustomFields } from './hooks/useCustomFields';
export { default as useNotification } from './hooks/useNotification';
export { default as useStrapiApp } from './hooks/useStrapiApp';
export { default as useTracking } from './hooks/useTracking';
export { default as useFetchClient } from './hooks/useFetchClient';
export { useSelectionState } from './hooks/useSelectionState';

export { default as useQueryParams } from './hooks/useQueryParams';
export { default as useOverlayBlocker } from './hooks/useOverlayBlocker';
export { default as useAutoReloadOverlayBlocker } from './hooks/useAutoReloadOverlayBlocker';
export { default as useRBACProvider } from './hooks/useRBACProvider';
export { default as useRBAC } from './hooks/useRBAC';
export { default as usePersistentState } from './hooks/usePersistentState';
export { default as useFocusWhenNavigate } from './hooks/useFocusWhenNavigate';
export { default as useLockScroll } from './hooks/useLockScroll';

// Providers
export { default as GuidedTourProvider } from './providers/GuidedTourProvider';
export { default as LibraryProvider } from './providers/LibraryProvider';
export { default as CustomFieldsProvider } from './providers/CustomFieldsProvider';
export { default as NotificationsProvider } from './providers/NotificationsProvider';
export { default as StrapiAppProvider } from './providers/StrapiAppProvider';
export { default as TrackingProvider } from './providers/TrackingProvider';

// Utils

// New components
export { default as CheckPagePermissions } from './components/CheckPagePermissions';
export { default as CheckPermissions } from './components/CheckPermissions';
export { default as ConfirmDialog } from './components/ConfirmDialog';
export { default as ContentBox } from './components/ContentBox';
export { default as DynamicTable } from './components/DynamicTable';
export { default as EmptyStateLayout } from './components/EmptyStateLayout';
export { default as NoContent } from './components/NoContent';
export { default as NoMedia } from './components/NoMedia';
export { default as NoPermissions } from './components/NoPermissions';
export { default as AnErrorOccurred } from './components/AnErrorOccurred';
export { default as EmptyBodyTable } from './components/EmptyBodyTable';
export { default as GenericInput } from './components/GenericInput';
export * from './components/InjectionZone';
export { default as LoadingIndicatorPage } from './components/LoadingIndicatorPage';
export { default as NotAllowedInput } from './components/NotAllowedInput';
export { default as SettingsPageTitle } from './components/SettingsPageTitle';
export { default as SearchURLQuery } from './components/SearchURLQuery';
export { default as Status } from './components/Status';
export { default as FilterListURLQuery } from './components/FilterListURLQuery';
export { default as FilterPopoverURLQuery } from './components/FilterPopoverURLQuery';
export { default as Form } from './components/Form';
export { default as PaginationURLQuery } from './components/PaginationURLQuery';
export { default as PageSizeURLQuery } from './components/PageSizeURLQuery';
export { default as RelativeTime } from './components/RelativeTime';
export { default as DateTimePicker } from './components/DateTimePicker';
export { default as ReactSelect } from './components/ReactSelect';
export { default as Link } from './components/Link';
export { default as LinkButton } from './components/LinkButton';

// New icons
export { default as SortIcon } from './icons/SortIcon';
export { default as RemoveRoundedButton } from './icons/RemoveRoundedButton';

// content-manager
export { default as ContentManagerEditViewDataManagerContext } from './content-manager/contexts/ContentManagerEditViewDataManagerContext';
export { default as useCMEditViewDataManager } from './content-manager/hooks/useCMEditViewDataManager';
export { getType };
export { getOtherInfos };

// Utils
export { default as auth } from './utils/auth';
export { default as hasPermissions } from './utils/hasPermissions';
export { default as prefixFileUrlWithBackendUrl } from './utils/prefixFileUrlWithBackendUrl/prefixFileUrlWithBackendUrl';
export { default as prefixPluginTranslations } from './utils/prefixPluginTranslations';
export { default as pxToRem } from './utils/pxToRem';
export { default as to } from './utils/await-to-js';
export { default as setHexOpacity } from './utils/setHexOpacity';
export { default as translatedErrors } from './utils/translatedErrors';
export { default as formatContentTypeData } from './content-manager/utils/formatContentTypeData';
export { findMatchingPermissions } from './utils/hasPermissions';
export { default as contentManagementUtilRemoveFieldsFromData } from './content-manager/utils/contentManagementUtilRemoveFieldsFromData';
export { default as getFileExtension } from './utils/getFileExtension/getFileExtension';
export * from './utils/stopPropagation';
export { default as difference } from './utils/difference';
export { default as wrapAxiosInstance } from './utils/wrapAxiosInstance';

export { default as request } from './utils/request';
export { default as getAPIInnerErrors } from './utils/getAPIInnerErrors';
export { default as getYupInnerErrors } from './utils/getYupInnerErrors';
