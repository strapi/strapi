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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HeaderLayout, Layout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Table, Thead, Tr, Th, Tbody, Td } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { IconButton } from '@strapi/design-system/IconButton';
import Pencil from '@strapi/icons/Pencil';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const { isLoading: isLoadingForData, data: modifiedData, isFetching } = useQuery(
    'get-providers',
    () => fetchData(toggleNotification),
    {
      onSuccess: () => {
        notifyStatus(
          formatMessage({
            id: getTrad('Providers.data.loaded'),
            defaultMessage: 'Providers have been loaded',
          })
        );
      },
      initialData: {},
    }
  );

  const isLoading = isLoadingForData || isFetching;

  const submitMutation = useMutation(putProvider, {
    onSuccess: async () => {
      await queryClient.invalidateQueries('get-providers');
      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.success.submit') },
      });

      trackUsageRef.current('didEditAuthenticationProvider');
      setIsSubmitting(false);
      handleToggleModal();
      unlockApp();
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
      unlockApp();
      setIsSubmitting(false);
    },
    refetchActive: false,
  });

  const providers = useMemo(() => createProvidersArray(modifiedData), [modifiedData]);

  const rowCount = providers.length;

  const isProviderWithSubdomain = useMemo(() => {
    if (!providerToEditName) {
      return false;
    }

    const providerToEdit = providers.find(obj => obj.name === providerToEditName);

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
    setIsOpen(prev => !prev);
  };

  const handleClickEdit = provider => {
    if (canUpdate) {
      setProviderToEditName(provider.name);
      handleToggleModal();
    }
  };

  const handleSubmit = async values => {
    setIsSubmitting(true);

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
            <Table colCount={4} rowCount={rowCount + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      <VisuallyHidden>
                        {formatMessage({ id: getTrad('Providers.image'), defaultMessage: 'Image' })}
                      </VisuallyHidden>
                    </Typography>
                  </Th>
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
                {providers.map(provider => (
                  <Tr
                    key={provider.name}
                    {...onRowClick({
                      fn: () => handleClickEdit(provider),
                      condition: canUpdate,
                    })}
                  >
                    <Td width="">
                      <FontAwesomeIcon icon={provider.icon} />
                    </Td>
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
        isSubmitting={isSubmitting}
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
