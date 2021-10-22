import { getType, getOtherInfos } from './content-manager/utils/getAttributeInfos';

// Assets
export { default as colors } from './old/assets/styles/colors';
export { default as sizes } from './old/assets/styles/sizes';

// Components
export { default as BackHeader } from './old/components/BackHeader';
export { default as BaselineAlignment } from './old/components/BaselineAlignment';
export { default as BlockerComponent } from './old/components/BlockerComponent';
export { default as Button } from './old/components/Button';
export { default as ButtonModal } from './old/components/ButtonModal';
export { default as Carret } from './old/components/Carret';
export { default as CircleButton } from './old/components/CircleButton';
export { default as ContainerFluid } from './old/components/ContainerFluid';
export { default as ErrorBoundary } from './old/components/ErrorBoundary';
export { default as ErrorFallback } from './old/components/ErrorFallback';
export { default as FilterButton } from './old/components/FilterButton';
export { default as GlobalPagination } from './old/components/GlobalPagination';
export { default as HeaderNav } from './old/components/HeaderNav';
export { default as HeaderModal } from './old/components/HeaderModal';
export { default as HeaderModalTitle } from './old/components/HeaderModalTitle';
export { default as HeaderSearch } from './old/components/HeaderSearch';
export { default as IcoContainer } from './old/components/IcoContainer';
export { default as InputAddon } from './old/components/InputAddon';
export { default as EmptyState } from './old/components/EmptyState';
export * from './old/components/Tabs';
export * from './old/components/Select';

export { default as DropdownIndicator } from './old/components/Select/DropdownIndicator';

export { default as InputAddonWithErrors } from './old/components/InputAddonWithErrors';
export { default as InputCheckbox } from './old/components/InputCheckbox';
export { default as InputCheckboxWithErrors } from './old/components/InputCheckboxWithErrors';
export { default as InputDescription } from './old/components/InputDescription';
export { default as InputEmail } from './old/components/InputEmail';
export { default as InputEmailWithErrors } from './old/components/InputEmailWithErrors';
export { default as InputErrors } from './old/components/InputErrors';
export { default as InputNumber } from './old/components/InputNumber';
export { default as InputNumberWithErrors } from './old/components/InputNumberWithErrors';
export { default as InputPassword } from './old/components/InputPassword';
export { default as InputPasswordWithErrors } from './old/components/InputPasswordWithErrors';
export { default as InputSearch } from './old/components/InputSearch';
export { default as InputSearchWithErrors } from './old/components/InputSearchWithErrors';
export { default as InputSelect } from './old/components/InputSelect';
export { default as InputSelectWithErrors } from './old/components/InputSelectWithErrors';
export { default as InputsIndex } from './old/components/InputsIndex';
export { default as InputSpacer } from './old/components/InputSpacer';
export { default as InputText } from './old/components/InputText';
export { default as InputTextWithErrors } from './old/components/InputTextWithErrors';
export { default as InputTextArea } from './old/components/InputTextArea';
export { default as InputTextAreaWithErrors } from './old/components/InputTextAreaWithErrors';
export { default as InputToggle } from './old/components/InputToggle';
export { default as InputToggleWithErrors } from './old/components/InputToggleWithErrors';

export { default as Label } from './old/components/Label';
export { default as LabelIconWrapper } from './old/components/LabelIconWrapper';
export { default as LeftMenu } from './old/components/LeftMenu';
export { default as LeftMenuList } from './old/components/LeftMenuList';
export { default as LiLink } from './old/components/LiLink';
export { default as List } from './old/components/List';
export { default as ListButton } from './old/components/ListButton';
export { default as ListRow } from './old/components/ListRow';
export { default as ListWrapper } from './old/components/ListWrapper';
export { default as ListHeader } from './old/components/ListHeader';
export { default as ListTitle } from './old/components/ListTitle';

export { default as LoadingBar } from './old/components/LoadingBar';
export { default as LoadingIndicator } from './old/components/LoadingIndicator';

export { default as ModalConfirm } from './old/components/ModalConfirm';
export { default as Modal } from './old/components/Modal';
export { default as ModalBody } from './old/components/BodyModal';
export { default as ModalHeader } from './old/components/ModalHeader';
export { default as ModalFooter } from './old/components/FooterModal';
export { default as ModalForm } from './old/components/FormModal';
export { default as ModalSection } from './old/components/ModalSection';
export { default as NotFound } from './old/components/NotFound';

export { default as PageFooter } from './old/components/PageFooter';
export { default as PluginHeader } from './old/components/PluginHeader';
export { default as RelationDPState } from './old/components/RelationDPState';
export { default as PopUpWarning } from './old/components/PopUpWarning';
export { default as Row } from './old/components/Row';
export { default as SearchInfo } from './old/components/SearchInfo';
export { default as SelectNav } from './old/components/SelectNav';
export { default as SelectWrapper } from './old/components/SelectWrapper';

export { default as ViewContainer } from './old/components/ViewContainer';

export { default as FormBloc } from './old/components/FormBloc';
export { default as IntlInput } from './old/components/IntlInput';
export { default as SizedInput } from './old/components/SizedInput';

export * from './old/components/Permissions';

// PopUpWarning
export { default as PopUpWarningBody } from './old/components/PopUpWarning/Body';
export { default as PopUpWarningFooter } from './old/components/PopUpWarning/StyledFooter';
export { default as PopUpWarningHeader } from './old/components/PopUpWarning/Header';
export { default as PopUpWarningIcon } from './old/components/PopUpWarning/Icon';
export { default as PopUpWarningModal } from './old/components/PopUpWarning/StyledModal';

// Contexts
export { default as AppInfosContext } from './contexts/AppInfosContext';
export {
  default as AutoReloadOverlayBockerContext,
} from './contexts/AutoReloadOverlayBockerContext';
export { default as NotificationsContext } from './contexts/NotificationsContext';
export { default as OverlayBlockerContext } from './contexts/OverlayBlockerContext';

export { default as RBACProviderContext } from './contexts/RBACProviderContext';
export { default as TrackingContext } from './contexts/TrackingContext';

// Hooks
export { default as useAppInfos } from './hooks/useAppInfos';

export { default as useQuery } from './hooks/useQuery';
export { default as useLibrary } from './hooks/useLibrary';
export { default as useNotification } from './hooks/useNotification';
export { default as useStrapiApp } from './hooks/useStrapiApp';
export { default as useTracking } from './hooks/useTracking';

export { default as useQueryParams } from './hooks/useQueryParams';
export { default as useOverlayBlocker } from './hooks/useOverlayBlocker';
export { default as useAutoReloadOverlayBlocker } from './hooks/useAutoReloadOverlayBlocker';
export { default as useRBACProvider } from './hooks/useRBACProvider';
export { default as useRBAC } from './hooks/useRBAC';
export { default as usePersistentState } from './hooks/usePersistentState';
export { default as useFocusWhenNavigate } from './hooks/useFocusWhenNavigate';
export { default as useLockScroll } from './hooks/useLockScroll';

// Providers
export { default as LibraryProvider } from './providers/LibraryProvider';
export { default as NotificationsProvider } from './providers/NotificationsProvider';
export { default as StrapiAppProvider } from './providers/StrapiAppProvider';

// Utils
export { default as cleanData } from './old/utils/cleanData';
export { default as difference } from './old/utils/difference';

export { default as dateFormats } from './old/utils/dateFormats';
export { default as dateToUtcTime } from './old/utils/dateToUtcTime';

export { darken } from './old/utils/colors';

export { default as getFilterType } from './old/utils/getFilterType';
export { default as getQueryParameters } from './old/utils/getQueryParameters';
export { default as validateInput } from './old/utils/inputsValidations';
export { default as request } from './old/utils/request';
export { default as storeData } from './old/utils/storeData';
export { default as templateObject } from './old/utils/templateObject';

export { default as getYupInnerErrors } from './old/utils/getYupInnerErrors';
export { default as generateFiltersFromSearch } from './old/utils/generateFiltersFromSearch';
export { default as generateSearchFromFilters } from './old/utils/generateSearchFromFilters';
export { default as generateSearchFromObject } from './old/utils/generateSearchFromObject';

// SVGS
export { default as LayoutIcon } from './old/svgs/Layout';
export { default as ClearIcon } from './old/svgs/Clear';
export { default as Close } from './old/svgs/Close';
export { default as EyeSlashed } from './old/svgs/EyeSlashed';
export { default as FilterIcon } from './old/svgs/Filter';
export { default as SearchIcon } from './old/svgs/Search';

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
export { default as Search } from './components/Search';
export { default as Status } from './components/Status';
export { default as FilterListURLQuery } from './components/FilterListURLQuery';
export { default as FilterPopoverURLQuery } from './components/FilterPopoverURLQuery';
export { default as Form } from './components/Form';
export { default as PaginationURLQuery } from './components/PaginationURLQuery';
export { default as PageSizeURLQuery } from './components/PageSizeURLQuery';

// New icons
export { default as SortIcon } from './icons/SortIcon';
export { default as RemoveRoundedButton } from './icons/RemoveRoundedButton';

// content-manager
export {
  default as ContentManagerEditViewDataManagerContext,
} from './content-manager/contexts/ContentManagerEditViewDataManagerContext';
export {
  default as useCMEditViewDataManager,
} from './content-manager/hooks/useCMEditViewDataManager';
export { getType };
export { getOtherInfos };

// Utils
export { default as auth } from './utils/auth';
export { default as hasPermissions } from './utils/hasPermissions';
export {
  default as prefixFileUrlWithBackendUrl,
} from './utils/prefixFileUrlWithBackendUrl/prefixFileUrlWithBackendUrl';
export { default as prefixPluginTranslations } from './utils/prefixPluginTranslations';
export { default as pxToRem } from './utils/pxToRem';
export { default as to } from './utils/await-to-js';
export { default as setHexOpacity } from './utils/setHexOpacity';
export { default as customEllipsis } from './utils/customEllipsis';
export { default as translatedErrors } from './utils/translatedErrors';
export { default as formatComponentData } from './content-manager/utils/formatComponentData';
export { findMatchingPermissions } from './utils/hasPermissions';
export {
  default as contentManagementUtilRemoveFieldsFromData,
} from './content-manager/utils/contentManagementUtilRemoveFieldsFromData';
export { default as getFileExtension } from './utils/getFileExtension/getFileExtension';
export * from './utils/stopPropagation';
