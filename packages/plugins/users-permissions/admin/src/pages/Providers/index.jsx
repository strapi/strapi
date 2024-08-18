import * as React from 'react';

import { useTracking, Layouts } from '@strapi/admin/strapi-admin';
import {
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
  useCollator,
} from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import {
  Page,
  useAPIErrorHandler,
  useNotification,
  useFetchClient,
  useRBAC,
} from '@strapi/strapi/admin';
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
  const { toggleNotification } = useNotification();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

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
      await queryClient.invalidateQueries(['users-permissions', 'get-providers']);

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: getTrad('notification.success.submit') }),
      });

      trackUsage('didEditAuthenticationProvider');

      handleToggleModal();
    },
    onError(error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
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
    trackUsage('willEditAuthenticationProvider');

    submitMutation.mutate({ providers: { ...data, [providerToEditName]: values } });
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: getTrad('HeaderNav.link.providers'),
              defaultMessage: 'Providers',
            }),
          }
        )}
      </Page.Title>
      <Page.Main>
        <Layouts.Header
          title={formatMessage({
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          })}
        />
        <Layouts.Content>
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
                  onClick={() => (canUpdate ? handleClickEdit(provider) : undefined)}
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
                  <Td onClick={(e) => e.stopPropagation()}>
                    {canUpdate && (
                      <IconButton
                        onClick={() => handleClickEdit(provider)}
                        variant="ghost"
                        label="Edit"
                      >
                        <Pencil />
                      </IconButton>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Layouts.Content>
      </Page.Main>
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
    </Layouts.Root>
  );
};

const ProtectedProvidersPage = () => (
  <Page.Protect permissions={PERMISSIONS.readProviders}>
    <ProvidersPage />
  </Page.Protect>
);

export default ProtectedProvidersPage;
