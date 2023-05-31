import { getType, getOtherInfos } from './content-manager/utils/getAttributeInfos';

/* -------------------------------------------------------------------------------------------------
 * Components
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * Content Manager
 * -----------------------------------------------------------------------------------------------*/

export { default as ContentManagerEditViewDataManagerContext } from './content-manager/contexts/ContentManagerEditViewDataManagerContext';
export { default as useCMEditViewDataManager } from './content-manager/hooks/useCMEditViewDataManager';
export { getType };
export { getOtherInfos };

/* -------------------------------------------------------------------------------------------------
 * Features
 * -----------------------------------------------------------------------------------------------*/

export * from './features/AppInfo';
export * from './features/AutoReloadOverlayBlocker';
export * from './features/CustomFields';
export * from './features/GuidedTour';
export * from './features/Library';
export * from './features/OverlayBlocker';
export * from './features/Notifications';
export * from './features/RBAC';
export * from './features/StrapiApp';
export * from './features/Tracking';

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * -----------------------------------------------------------------------------------------------*/

export { default as useQuery } from './hooks/useQuery';
export { useSelectionState } from './hooks/useSelectionState';
export * from './hooks/useAPIErrorHandler';
export { useFilter } from './hooks/useFilter';
export { useCollator } from './hooks/useCollator';
export { useCallbackRef } from './hooks/useCallbackRef';
export { useClipboard } from './hooks/useClipboard';

export { default as useQueryParams } from './hooks/useQueryParams';
export { default as useRBAC } from './hooks/useRBAC';
export { default as usePersistentState } from './hooks/usePersistentState';
export { default as useFocusWhenNavigate } from './hooks/useFocusWhenNavigate';
export { default as useLockScroll } from './hooks/useLockScroll';
export { default as useFetchClient } from './hooks/useFetchClient';

/* -------------------------------------------------------------------------------------------------
 * Icons
 * -----------------------------------------------------------------------------------------------*/

export { default as SortIcon } from './icons/SortIcon';
export { default as RemoveRoundedButton } from './icons/RemoveRoundedButton';

/* -------------------------------------------------------------------------------------------------
 * Utils
 * -----------------------------------------------------------------------------------------------*/

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

export { default as getFetchClient } from './utils/getFetchClient';
