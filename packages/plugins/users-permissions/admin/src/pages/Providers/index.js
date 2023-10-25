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
  useCollator,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Pencil } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import FormModal from '../../components/FormModal';
import { PERMISSIONS } from '../../constants';
import { getTrad } from '../../utils';

import forms from './utils/forms';

export const ProvidersPage = () => {
  const { formatMessage, locale } = useIntl();
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const [isOpen, setIsOpen] = React.useState(false);
  const [providerToEditName, setProviderToEditName] = React.useState(null);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  useFocusWhenNavigate();

  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.updateProviders });

  const { isLoading: isLoadingData, data } = useQuery(
    ['users-permissions', 'get-providers'],
    async () => {
      const { data } = await get('/users-permissions/providers');

      return data;
    },
    {
      initialData: {},
    }
  );

  const submitMutation = useMutation((body) => put('/users-permissions/providers', body), {
    async onSuccess() {
      await queryClient.invalidateQueries(['users-permissions', 'providers']);

      toggleNotification({
        type: 'success',
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

  const providers = Object.entries(data)
    .reduce((acc, [name, provider]) => {
      const { icon, enabled, subdomain } = provider;

      acc.push({
        name,
        icon: icon === 'envelope' ? ['fas', 'envelope'] : ['fab', icon],
        enabled,
        subdomain,
      });

      return acc;
    }, [])
    .sort((a, b) => formatter.compare(a.name, b.name));

  const isLoading = isLoadingData || isLoadingPermissions;

  const isProviderWithSubdomain = React.useMemo(() => {
    if (!providerToEditName) {
      return false;
    }

    const providerToEdit = providers.find((obj) => obj.name === providerToEditName);

    return !!providerToEdit?.subdomain;
  }, [providers, providerToEditName]);

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
      <SettingsPageTitle
        name={formatMessage({
          id: getTrad('HeaderNav.link.providers'),
          defaultMessage: 'Providers',
        })}
      />
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          })}
        />
        {isLoading ? (
          <LoadingIndicatorPage />
        ) : (
          <ContentLayout>
            <Table colCount={3} rowCount={providers.length + 1}>
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
