// Assets
export { default as colors } from './assets/styles/colors';
export { default as sizes } from './assets/styles/sizes';

// CommonPropTypes
export { default as routerPropTypes } from './commonPropTypes/router';
export { default as themePropTypes } from './commonPropTypes/themeShape';
// Components
export { default as BackHeader } from './components/BackHeader';
export { default as BlockerComponent } from './components/BlockerComponent';
export { default as Button } from './components/Button';
export { default as ButtonModal } from './components/ButtonModal';
export { default as CircleButton } from './components/CircleButton';
export { default as ContainerFluid } from './components/ContainerFluid';
export { default as ErrorBoundary } from './components/ErrorBoundary';
export { default as ExtendComponent } from './components/ExtendComponent';
export { default as FilterButton } from './components/FilterButton';
export { default as GlobalPagination } from './components/GlobalPagination';
export { default as HeaderNav } from './components/HeaderNav';
export { default as HeaderModal } from './components/HeaderModal';
export { default as HeaderModalTitle } from './components/HeaderModalTitle';
export { default as HeaderSearch } from './components/HeaderSearch';
export { default as IcoContainer } from './components/IcoContainer';
export { default as InputAddon } from './components/InputAddon';

export { default as InputAddonWithErrors } from './components/InputAddonWithErrors';
export { default as InputCheckbox } from './components/InputCheckbox';
export { default as InputCheckboxWithErrors } from './components/InputCheckboxWithErrors';
export { default as InputDescription } from './components/InputDescription';
export { default as InputEmail } from './components/InputEmail';
export { default as InputEmailWithErrors } from './components/InputEmailWithErrors';
export { default as InputErrors } from './components/InputErrors';
export { default as InputNumber } from './components/InputNumber';
export { default as InputNumberWithErrors } from './components/InputNumberWithErrors';
export { default as InputPassword } from './components/InputPassword';
export { default as InputPasswordWithErrors } from './components/InputPasswordWithErrors';
export { default as InputSearch } from './components/InputSearch';
export { default as InputSearchWithErrors } from './components/InputSearchWithErrors';
export { default as InputSelect } from './components/InputSelect';
export { default as InputSelectWithErrors } from './components/InputSelectWithErrors';
export { default as InputsIndex } from './components/InputsIndex';
export { default as InputSpacer } from './components/InputSpacer';
export { default as InputText } from './components/InputText';
export { default as InputTextWithErrors } from './components/InputTextWithErrors';
export { default as InputTextArea } from './components/InputTextArea';
export { default as InputTextAreaWithErrors } from './components/InputTextAreaWithErrors';
export { default as InputToggle } from './components/InputToggle';
export { default as InputToggleWithErrors } from './components/InputToggleWithErrors';

export { default as Label } from './components/Label';
export { default as LeftMenu } from './components/LeftMenu';
export { default as LeftMenuList } from './components/LeftMenuList';
export { default as LiLink } from './components/LiLink';
export { default as List } from './components/List';
export { default as ListButton } from './components/ListButton';
export { default as ListRow } from './components/ListRow';
export { default as ListWrapper } from './components/ListWrapper';
export { default as ListHeader } from './components/ListHeader';
export { default as ListTitle } from './components/ListTitle';

export { default as LoadingBar } from './components/LoadingBar';
export { default as LoadingIndicator } from './components/LoadingIndicator';
export { default as LoadingIndicatorPage } from './components/LoadingIndicatorPage';

export { default as Modal } from './components/Modal';
export { default as ModalBody } from './components/BodyModal';
export { default as ModalHeader } from './components/ModalHeader';
export { default as ModalFooter } from './components/FooterModal';
export { default as ModalForm } from './components/FormModal';
export { default as ModalSection } from './components/ModalSection';
export { default as NotFound } from './components/NotFound';
export { default as OverlayBlocker } from './components/OverlayBlocker';
export { default as PageFooter } from './components/PageFooter';
export { default as PluginHeader } from './components/PluginHeader';
export { default as PopUpWarning } from './components/PopUpWarning';
export { default as Row } from './components/Row';
export { default as SearchInfo } from './components/SearchInfo';
export { default as SelectNav } from './components/SelectNav';
export { default as SelectWrapper } from './components/SelectWrapper';
export { default as UserProvider } from './components/UserProvider';
export { default as ViewContainer } from './components/ViewContainer';
export { default as CheckPagePermissions } from './components/CheckPagePermissions';
export { default as CheckPermissions } from './components/CheckPermissions';

// Contexts
export { GlobalContext, GlobalContextProvider, useGlobalContext } from './contexts/GlobalContext';
export { default as UserContext } from './contexts/UserContext';

// Hooks
export { default as useQuery } from './hooks/useQuery';
export { default as useStrapi } from './hooks/useStrapi';
export { default as useUser } from './hooks/useUser';
export { default as useUserPermissions } from './hooks/useUserPermissions';

// Providers
export { default as StrapiProvider } from './providers/StrapiProvider';

// Utils
export { default as auth } from './utils/auth';
export { default as cleanData } from './utils/cleanData';
export { default as difference } from './utils/difference';
export { default as dateFormats } from './utils/dateFormats';
export { default as dateToUtcTime } from './utils/dateToUtcTime';
export { default as hasPermissions } from './utils/hasPermissions';
export { findMatchingPermissions } from './utils/hasPermissions';
export { default as translatedErrors } from './utils/translatedErrors';
export { darken } from './utils/colors';
export { default as getFileExtension } from './utils/getFileExtension';
export { default as getFilterType } from './utils/getFilterType';
export { default as getQueryParameters } from './utils/getQueryParameters';
export { default as injectHooks } from './utils/injectHooks';
export { default as validateInput } from './utils/inputsValidations';
export { default as Manager } from './utils/Manager';
export { default as request } from './utils/request';
export { default as storeData } from './utils/storeData';
export { default as templateObject } from './utils/templateObject';
export { default as getYupInnerErrors } from './utils/getYupInnerErrors';
export { default as generateFiltersFromSearch } from './utils/generateFiltersFromSearch';
export { default as generateSearchFromFilters } from './utils/generateSearchFromFilters';
export { default as generateSearchFromObject } from './utils/generateSearchFromObject';
export { default as prefixFileUrlWithBackendUrl } from './utils/prefixFileUrlWithBackendUrl';

// SVGS
export { default as LayoutIcon } from './svgs/Layout';
export { default as ClearIcon } from './svgs/Clear';
export { default as Close } from './svgs/Close';
export { default as FilterIcon } from './svgs/Filter';
export { default as SearchIcon } from './svgs/Search';
