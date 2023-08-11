import * as React from 'react';

import {
  ContentLayout,
  HeaderLayout,
  IconButton,
  Layout,
  Main,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  onRowClick,
  SettingsPageTitle,
  stopPropagation,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Pencil } from '@strapi/icons';
import has from 'lodash/has';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import FormModal from '../../components/FormModal';
import { PERMISSIONS } from '../../constants';
import { getTrad } from '../../utils';

import createProvidersArray from './utils/createProvidersArray';
import forms from './utils/forms';

export const ProvidersPage = () => {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const [isOpen, setIsOpen] = React.useState(false);
  const [providerToEditName, setProviderToEditName] = React.useState(null);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  useFocusWhenNavigate();

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.updateProviders });

  const { isLoading: isLoadingData, data } = useQuery(
    ['users-permissions', 'get-providers'],
    async () => {
      const { data } = await get('/users-permissions/providers');

      return data;
    }
  );

  const isLoading = isLoadingData;

  const submitMutation = useMutation((body) => put('/users-permissions/providers', body), {
    async onSuccess() {
      await queryClient.invalidateQueries(['users-permissions', 'providers']);

      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.success.submit') },
      });

      trackUsage('didEditAuthenticationProvider');

      handleToggleModal();
      unlockApp();
    },
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      unlockApp();
    },
    refetchActive: false,
  });

  const providers = React.useMemo(() => createProvidersArray(data), [data]);

  const rowCount = providers.length;

  const isProviderWithSubdomain = React.useMemo(() => {
    if (!providerToEditName) {
      return false;
    }

    const providerToEdit = providers.find((obj) => obj.name === providerToEditName);

    return has(providerToEdit, 'subdomain');
  }, [providers, providerToEditName]);

  const pageTitle = formatMessage({
    id: getTrad('HeaderNav.link.providers'),
    defaultMessage: 'Providers',
  });

  const layoutToRender = React.useMemo(() => {
    if (providerToEditName === 'email') {
      return forms.email;
    }

    if (isProviderWithSubdomain) {
      return forms.providersWithSubdomain;
    }

    return forms.providers;
  }, [providerToEditName, isProviderWithSubdomain]);

  const handleToggleModal = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClickEdit = (provider) => {
    if (canUpdate) {
      setProviderToEditName(provider.name);
      handleToggleModal();
    }
  };

  const handleSubmit = async (values) => {
    lockApp();

    trackUsage('willEditAuthenticationProvider');

    submitMutation.mutate({ providers: { ...data, [providerToEditName]: values } });
  };

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          })}
        />
        {isLoading || isLoadingForPermissions ? (
          <LoadingIndicatorPage />
        ) : (
          <ContentLayout>
            <Table colCount={3} rowCount={rowCount + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({ id: getTrad('Providers.status'), defaultMessage: 'Status' })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">
                      <VisuallyHidden>
                        {formatMessage({
                          id: 'global.settings',
                          defaultMessage: 'Settings',
                        })}
                      </VisuallyHidden>
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {providers.map((provider) => (
                  <Tr
                    key={provider.name}
                    {...onRowClick({
                      fn: () => handleClickEdit(provider),
                      condition: canUpdate,
                    })}
                  >
                    <Td width="45%">
                      <Typography fontWeight="semiBold" textColor="neutral800">
                        {provider.name}
                      </Typography>
                    </Td>
                    <Td width="65%">
                      <Typography
                        textColor={provider.enabled ? 'success600' : 'danger600'}
                        data-testid={`enable-${provider.name}`}
                      >
                        {provider.enabled
                          ? formatMessage({
                              id: 'global.enabled',
                              defaultMessage: 'Enabled',
                            })
                          : formatMessage({
                              id: 'global.disabled',
                              defaultMessage: 'Disabled',
                            })}
                      </Typography>
                    </Td>
                    <Td {...stopPropagation}>
                      {canUpdate && (
                        <IconButton
                          onClick={() => handleClickEdit(provider)}
                          noBorder
                          icon={<Pencil />}
                          label="Edit"
                        />
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ContentLayout>
        )}
      </Main>
      <FormModal
        initialData={data[providerToEditName]}
        isOpen={isOpen}
        isSubmiting={submitMutation.isLoading}
        layout={layoutToRender}
        headerBreadcrumbs={[
          formatMessage({
            id: getTrad('PopUpForm.header.edit.providers'),
            defaultMessage: 'Edit Provider',
          }),
          upperFirst(providerToEditName),
        ]}
        onToggle={handleToggleModal}
        onSubmit={handleSubmit}
        providerToEditName={providerToEditName}
      />
    </Layout>
  );
};

const ProtectedProvidersPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.readProviders}>
    <ProvidersPage />
  </CheckPagePermissions>
);

export default ProtectedProvidersPage;
