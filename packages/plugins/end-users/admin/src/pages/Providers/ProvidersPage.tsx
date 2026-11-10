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
  Button,
  Dialog,
  EmptyStateLayout,
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
import { Pencil, Plus, Trash } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { CheckModeNotice } from '../../components/CheckModeNotice';
import { MigrationBanner } from '../../components/MigrationBanner';
import { PERMISSIONS } from '../../constants';
import { useDeleteProviderMutation, useGetProvidersQuery } from '../../services/providers';
import { getTranslation } from '../../utils/getTranslation';

import { AddOidcModal } from './AddOidcModal';
import { ProviderModal } from './ProviderModal';
import { CUSTOM_OIDC, ProviderPicker } from './ProviderPicker';

import type { ProviderSummary } from '../../../../shared/contracts/providers';

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
  const [isPicking, setIsPicking] = React.useState(false);
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

  const handlePick = (value: string) => {
    setIsPicking(false);

    if (value === CUSTOM_OIDC) {
      setIsAddingOidc(true);
    } else {
      setOpenId(value);
    }
  };

  const addLabel = formatMessage({
    id: getTranslation('providers.add'),
    defaultMessage: 'Add new provider',
  });

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
        primaryAction={
          canUpdate && (
            <Button startIcon={<Plus />} size="S" onClick={() => setIsPicking(true)}>
              {addLabel}
            </Button>
          )
        }
      />
      <Layouts.Content>
        {configured.length === 0 ? (
          <EmptyStateLayout
            icon={<EmptyDocuments width="160px" />}
            content={formatMessage({
              id: getTranslation('providers.empty'),
              defaultMessage: 'No provider is configured yet.',
            })}
            action={
              canUpdate ? (
                <Button variant="secondary" startIcon={<Plus />} onClick={() => setIsPicking(true)}>
                  {addLabel}
                </Button>
              ) : null
            }
          />
        ) : (
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
        )}
      </Layouts.Content>

      <ProviderPicker
        open={isPicking}
        available={available}
        onClose={() => setIsPicking(false)}
        onPick={handlePick}
      />
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
    <MigrationBanner />
    <CheckModeNotice>
      <ProvidersContent />
    </CheckModeNotice>
  </Page.Protect>
);

export { ProvidersPage };
