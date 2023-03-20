import React, { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  LoadingIndicatorPage,
  useTracking,
  useNotification,
  useOverlayBlocker,
  CheckPagePermissions,
  useRBAC,
  useFocusWhenNavigate,
  onRowClick,
  stopPropagation,
} from '@strapi/helper-plugin';
import has from 'lodash/has';
import upperFirst from 'lodash/upperFirst';
import {
  HeaderLayout,
  Layout,
  ContentLayout,
  Main,
  useNotifyAT,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Typography,
  IconButton,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import forms from './utils/forms';
import { fetchData, putProvider } from './utils/api';
import createProvidersArray from './utils/createProvidersArray';
import { getTrad } from '../../utils';
import pluginPermissions from '../../permissions';
import FormModal from '../../components/FormModal';

export const ProvidersPage = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();
  const { notifyStatus } = useNotifyAT();
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [providerToEditName, setProviderToEditName] = useState(null);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateProviders };
  }, []);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(updatePermissions);

  const {
    isLoading: isLoadingForData,
    data: modifiedData,
    isFetching,
  } = useQuery('get-providers', () => fetchData(toggleNotification), {
    onSuccess() {
      notifyStatus(
        formatMessage({
          id: getTrad('Providers.data.loaded'),
          defaultMessage: 'Providers have been loaded',
        })
      );
    },
    initialData: {},
  });

  const isLoading = isLoadingForData || isFetching;

  const submitMutation = useMutation(putProvider, {
    async onSuccess() {
      await queryClient.invalidateQueries('get-providers');
      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.success.submit') },
      });

      trackUsageRef.current('didEditAuthenticationProvider');
      setIsSubmiting(false);
      handleToggleModal();
      unlockApp();
    },
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
      unlockApp();
      setIsSubmiting(false);
    },
    refetchActive: false,
  });

  const providers = useMemo(() => createProvidersArray(modifiedData), [modifiedData]);

  const rowCount = providers.length;

  const isProviderWithSubdomain = useMemo(() => {
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

  const layoutToRender = useMemo(() => {
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
    setIsSubmiting(true);

    lockApp();

    trackUsageRef.current('willEditAuthenticationProvider');

    const body = { ...modifiedData, [providerToEditName]: values };

    submitMutation.mutate({ providers: body });
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
        initialData={modifiedData[providerToEditName]}
        isOpen={isOpen}
        isSubmiting={isSubmiting}
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
  <CheckPagePermissions permissions={pluginPermissions.readProviders}>
    <ProvidersPage />
  </CheckPagePermissions>
);

export default ProtectedProvidersPage;
