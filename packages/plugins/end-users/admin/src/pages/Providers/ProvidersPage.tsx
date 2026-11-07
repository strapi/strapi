import * as React from 'react';

import {
  ConfirmDialog,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Badge,
  Combobox,
  ComboboxOption,
  Dialog,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { PERMISSIONS } from '../../constants';
import { useDeleteProviderMutation, useGetProvidersQuery } from '../../services/providers';
import { getTranslation } from '../../utils/getTranslation';

import { AddOidcModal } from './AddOidcModal';
import { ProviderModal } from './ProviderModal';

import type { ProviderSummary } from '../../../../shared/contracts/providers';

/** The picker's choice for a provider that is not in the list */
const CUSTOM_OIDC = '__custom-oidc__';

const ProvidersContent = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.providers);
  const { data: providers, isLoading, error } = useGetProvidersQuery();
  const [deleteProvider] = useDeleteProviderMutation();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [isAddingOidc, setIsAddingOidc] = React.useState(false);
  // The picker is made anew after each choice, so it starts empty and unfiltered again
  const [pickerKey, setPickerKey] = React.useState(0);
  const [toDelete, setToDelete] = React.useState<ProviderSummary | null>(null);

  if (isLoading || isLoadingPermissions) {
    return <Page.Loading />;
  }

  if (error || !providers) {
    return <Page.Error />;
  }

  const configured = providers.filter((provider) => provider.configured);
  const available = providers.filter((provider) => !provider.configured);

  const title = formatMessage({
    id: getTranslation('providers.title'),
    defaultMessage: 'Providers',
  });

  const statusLabels: Record<ProviderSummary['status'], string> = {
    ready: formatMessage({ id: getTranslation('providers.status.ready'), defaultMessage: 'Ready' }),
    'needs-secret': formatMessage({
      id: getTranslation('providers.status.needs-secret'),
      defaultMessage: 'Needs a new secret',
    }),
    disabled: formatMessage({
      id: getTranslation('providers.status.disabled'),
      defaultMessage: 'Disabled',
    }),
  };

  const handlePick = (value: string | number | null | undefined) => {
    setPickerKey((key) => key + 1);

    if (value === CUSTOM_OIDC) {
      setIsAddingOidc(true);
    } else if (typeof value === 'string' && value !== '') {
      setOpenId(value);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) {
      return;
    }

    const result = await deleteProvider(toDelete.id);

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });
    }
  };

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          { name: title }
        )}
      </Page.Title>
      <Layouts.Header
        title={title}
        subtitle={formatMessage({
          id: getTranslation('providers.subtitle'),
          defaultMessage: 'The identity providers end users can sign in with',
        })}
      />
      {canUpdate && (
        <Layouts.Action
          startActions={
            <Combobox
              key={pickerKey}
              aria-label={formatMessage({
                id: getTranslation('providers.add'),
                defaultMessage: 'Add provider',
              })}
              placeholder={formatMessage({
                id: getTranslation('providers.add'),
                defaultMessage: 'Add provider',
              })}
              onChange={handlePick}
            >
              {available.map((provider) => (
                <ComboboxOption key={provider.id} value={provider.id}>
                  {provider.name}
                </ComboboxOption>
              ))}
              <ComboboxOption value={CUSTOM_OIDC}>
                {formatMessage({
                  id: getTranslation('providers.custom-oidc'),
                  defaultMessage: 'Custom OIDC',
                })}
              </ComboboxOption>
            </Combobox>
          }
        />
      )}
      <Layouts.Content>
        <Table colCount={5} rowCount={configured.length + 1}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('providers.column.source'),
                    defaultMessage: 'Source',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('providers.column.enabled'),
                    defaultMessage: 'Enabled',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('providers.column.status'),
                    defaultMessage: 'Status',
                  })}
                </Typography>
              </Th>
              <Th>
                <VisuallyHidden>
                  {formatMessage({ id: 'global.actions', defaultMessage: 'Actions' })}
                </VisuallyHidden>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {configured.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <Typography textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('providers.empty'),
                      defaultMessage: 'No provider is configured yet.',
                    })}
                  </Typography>
                </Td>
              </Tr>
            )}
            {configured.map((provider) => (
              <Tr key={provider.id} cursor="pointer" onClick={() => setOpenId(provider.id)}>
                <Td>
                  <Typography textColor="neutral800">{provider.name}</Typography>
                </Td>
                <Td>
                  {provider.source === 'config' ? (
                    <Badge>
                      {formatMessage({
                        id: getTranslation('providers.source.config'),
                        defaultMessage: 'Configured in config/plugins.ts',
                      })}
                    </Badge>
                  ) : (
                    <Typography textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('providers.source.admin'),
                        defaultMessage: 'Admin',
                      })}
                    </Typography>
                  )}
                </Td>
                <Td>
                  <Typography textColor="neutral800">
                    {provider.enabled
                      ? formatMessage({ id: getTranslation('settings.on'), defaultMessage: 'On' })
                      : formatMessage({
                          id: getTranslation('settings.off'),
                          defaultMessage: 'Off',
                        })}
                  </Typography>
                </Td>
                <Td>
                  <Typography
                    textColor={provider.status === 'needs-secret' ? 'danger600' : 'neutral800'}
                  >
                    {statusLabels[provider.status]}
                  </Typography>
                </Td>
                <Td onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                  <Flex gap={1} justifyContent="flex-end">
                    <IconButton
                      variant="ghost"
                      label={formatMessage(
                        {
                          id: getTranslation('providers.edit'),
                          defaultMessage: 'Open {name}',
                        },
                        { name: provider.name }
                      )}
                      onClick={() => setOpenId(provider.id)}
                    >
                      <Pencil />
                    </IconButton>
                    {canUpdate && provider.source === 'admin' && (
                      <IconButton
                        variant="ghost"
                        label={formatMessage(
                          {
                            id: getTranslation('providers.delete'),
                            defaultMessage: 'Delete {name}',
                          },
                          { name: provider.name }
                        )}
                        onClick={() => setToDelete(provider)}
                      >
                        <Trash />
                      </IconButton>
                    )}
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Layouts.Content>

      <ProviderModal id={openId} canUpdate={canUpdate} onClose={() => setOpenId(null)} />
      <AddOidcModal
        open={isAddingOidc}
        onClose={() => setIsAddingOidc(false)}
        onCreated={(id) => {
          setIsAddingOidc(false);
          setOpenId(id);
        }}
      />
      <Dialog.Root open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        {toDelete && (
          <ConfirmDialog onConfirm={handleDelete}>
            <Typography>
              {formatMessage(
                {
                  id: getTranslation('providers.delete.question'),
                  defaultMessage:
                    'Delete {name}? Its settings and secret are removed, and end users can no longer sign in with it.',
                },
                { name: toDelete.name }
              )}
            </Typography>
          </ConfirmDialog>
        )}
      </Dialog.Root>
    </Page.Main>
  );
};

const ProvidersPage = () => (
  <Page.Protect permissions={PERMISSIONS.providers.read}>
    <ProvidersContent />
  </Page.Protect>
);

export { ProvidersPage };
