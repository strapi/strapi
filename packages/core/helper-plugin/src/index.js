import { getOtherInfos, getType } from './content-manager/utils/getAttributeInfos';

/* -------------------------------------------------------------------------------------------------
 * Components
 * -----------------------------------------------------------------------------------------------*/

export { AnErrorOccurred } from './components/AnErrorOccurred';
export { CheckPagePermissions } from './components/CheckPagePermissions';
export { CheckPermissions } from './components/CheckPermissions';
export * from './components/ConfirmDialog';
export { ContentBox } from './components/ContentBox';
export { DateTimePicker } from './components/DateTimePicker';
export { DynamicTable } from './components/DynamicTable';
export { Table, useTableContext } from './components/Table';
export { EmptyStateLayout } from './components/EmptyStateLayout';
export { EmptyBodyTable } from './components/EmptyBodyTable';
export { FilterListURLQuery } from './components/FilterListURLQuery';
export { FilterPopoverURLQuery } from './components/FilterPopoverURLQuery';
export { Form } from './components/Form';
export { GenericInput } from './components/GenericInput';
export * from './components/InjectionZone';
export { Link } from './components/Link';
export { LinkButton } from './components/LinkButton';
export { LoadingIndicatorPage } from './components/LoadingIndicatorPage';
export { NoContent } from './components/NoContent';
export { NoMedia } from './components/NoMedia';
export { NoPermissions } from './components/NoPermissions';
export { NotAllowedInput } from './components/NotAllowedInput';
export { PageSizeURLQuery } from './components/PageSizeURLQuery';
export { PaginationURLQuery } from './components/PaginationURLQuery';
export { ReactSelect } from './components/ReactSelect';
export { RelativeTime } from './components/RelativeTime';
export { SearchURLQuery } from './components/SearchURLQuery';
export { SettingsPageTitle } from './components/SettingsPageTitle';
export { Status } from './components/Status';

/* -------------------------------------------------------------------------------------------------
 * Content Manager
 * -----------------------------------------------------------------------------------------------*/

export { ContentManagerEditViewDataManagerContext } from './content-manager/contexts/ContentManagerEditViewDataManagerContext';
export { useCMEditViewDataManager } from './content-manager/hooks/useCMEditViewDataManager';
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
export * from './features/Notifications';
export * from './features/OverlayBlocker';
export * from './features/RBAC';
export * from './features/StrapiApp';
export * from './features/Tracking';

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * -----------------------------------------------------------------------------------------------*/

export * from './hooks/useAPIErrorHandler';
export { useCallbackRef } from './hooks/useCallbackRef';
export { useClipboard } from './hooks/useClipboard';
export { useCollator } from './hooks/useCollator';
export { useFetchClient } from './hooks/useFetchClient';
export { useFilter } from './hooks/useFilter';
export { useFocusWhenNavigate } from './hooks/useFocusWhenNavigate';
export { useLockScroll } from './hooks/useLockScroll';
export { usePersistentState } from './hooks/usePersistentState';
export { useQuery } from './hooks/useQuery';
export { useQueryParams } from './hooks/useQueryParams';
export { useRBAC } from './hooks/useRBAC';
export { useSelectionState } from './hooks/useSelectionState';

/* -------------------------------------------------------------------------------------------------
 * Icons
 * -----------------------------------------------------------------------------------------------*/

export { RemoveRoundedButton } from './icons/RemoveRoundedButton';
export { SortIcon } from './icons/SortIcon';

/* -------------------------------------------------------------------------------------------------
 * Utils
 * -----------------------------------------------------------------------------------------------*/

export { contentManagementUtilRemoveFieldsFromData } from './content-manager/utils/contentManagementUtilRemoveFieldsFromData';
export { formatContentTypeData } from './content-manager/utils/formatContentTypeData';
export { auth } from './utils/auth';
export { to } from './utils/awaitToJs';
export { difference } from './utils/difference';
export { getAPIInnerErrors } from './utils/getAPIInnerErrors';
export { getFetchClient } from './utils/getFetchClient';
export { getFileExtension } from './utils/getFileExtension';
export { getYupInnerErrors } from './utils/getYupInnerErrors';
export { hasPermissions } from './utils/hasPermissions';
export { findMatchingPermissions } from './utils/hasPermissions';
export { normalizeAPIError } from './utils/normalizeAPIError';
export { prefixFileUrlWithBackendUrl } from './utils/prefixFileUrlWithBackendUrl';
export { prefixPluginTranslations } from './utils/prefixPluginTranslations';
export { pxToRem } from './utils/pxToRem';
export { request } from './utils/request';
export { setHexOpacity } from './utils/setHexOpacity';
export * from './utils/stopPropagation';
export { translatedErrors } from './utils/translatedErrors';
export { wrapAxiosInstance } from './utils/wrapAxiosInstance';
