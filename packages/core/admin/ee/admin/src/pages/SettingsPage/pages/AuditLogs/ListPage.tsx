import { Button, Flex, IconButton, Typography } from '@strapi/design-system';
import { Download, Eye } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Filters } from '../../../../../../../admin/src/components/Filters';
import { Layouts } from '../../../../../../../admin/src/components/Layouts/Layout';
import { Page } from '../../../../../../../admin/src/components/PageHelpers';
import { Pagination } from '../../../../../../../admin/src/components/Pagination';
import { Table } from '../../../../../../../admin/src/components/Table';
import { useTypedSelector } from '../../../../../../../admin/src/core/store/hooks';
import { useQueryParams } from '../../../../../../../admin/src/hooks/useQueryParams';
import { useRBAC } from '../../../../../../../admin/src/hooks/useRBAC';
import { AuditLog } from '../../../../../../../shared/contracts/audit-logs';

import { Modal } from './components/Modal';
import { useAuditLogsData } from './hooks/useAuditLogsData';
import { useFormatTimeStamp } from './hooks/useFormatTimeStamp';
import { getDefaultMessage } from './utils/getActionTypesDefaultMessages';
import { getDisplayedFilters } from './utils/getDisplayedFilters';

const escapeCsvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const ListPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings);

  const {
    allowedActions: { canRead: canReadAuditLogs, canReadUsers },
    isLoading: isLoadingRBAC,
  } = useRBAC({
    ...permissions?.auditLogs,
    readUsers: permissions?.users.read || [],
  });

  const [{ query }, setQuery] = useQueryParams<{ id?: AuditLog['id'] }>();
  const {
    auditLogs,
    users,
    isLoading: isLoadingData,
    hasError,
  } = useAuditLogsData({
    canReadAuditLogs,
    canReadUsers,
  });

  const formatTimeStamp = useFormatTimeStamp();

  const displayedFilters = getDisplayedFilters({ formatMessage, users, canReadUsers });

  const headers: Table.Header<AuditLog, object>[] = [
    {
      name: 'action',
      label: formatMessage({
        id: 'Settings.permissions.auditLogs.action',
        defaultMessage: 'Action',
      }),
      sortable: true,
    },
    {
      name: 'date',
      label: formatMessage({
        id: 'Settings.permissions.auditLogs.date',
        defaultMessage: 'Date',
      }),
      sortable: true,
    },
    {
      name: 'user',
      label: formatMessage({
        id: 'Settings.permissions.auditLogs.user',
        defaultMessage: 'User',
      }),
      sortable: false,
      // In this case, the passed parameter cannot and shouldn't be something else than User
      cellFormatter: ({ user }) => (user ? user.displayName : ''),
    },
  ];

  if (hasError) {
    return <Page.Error />;
  }

  const isLoading = isLoadingData || isLoadingRBAC;

  const { results = [] } = auditLogs ?? {};

  const handleExport = () => {
    const actionHeader = formatMessage({
      id: 'Settings.permissions.auditLogs.action',
      defaultMessage: 'Action',
    });
    const dateHeader = formatMessage({
      id: 'Settings.permissions.auditLogs.date',
      defaultMessage: 'Date',
    });
    const userHeader = formatMessage({
      id: 'Settings.permissions.auditLogs.user',
      defaultMessage: 'User',
    });

    const headerRow = [actionHeader, dateHeader, userHeader].map(escapeCsvCell).join(',');

    const dataRows = results.map((log) => {
      const actionLabel = formatMessage(
        {
          id: `Settings.permissions.auditLogs.${log.action}`,
          // @ts-expect-error – same pattern as table cells
          defaultMessage: getDefaultMessage(log.action),
        },
        { model: (log.payload?.model as string) ?? '' }
      );
      const dateLabel = formatTimeStamp(log.date);
      const userLabel = log.user?.displayName ?? '';

      return [actionLabel, dateLabel, userLabel].map(escapeCsvCell).join(',');
    });

    const csv = `\uFEFF${[headerRow, ...dataRows].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page.Main aria-busy={isLoading}>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: 'global.auditLogs',
              defaultMessage: 'Audit Logs',
            }),
          }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({
          id: 'global.auditLogs',
          defaultMessage: 'Audit Logs',
        })}
        subtitle={formatMessage({
          id: 'Settings.permissions.auditLogs.listview.header.subtitle',
          defaultMessage: 'Logs of all the activities that happened in your environment',
        })}
      />
      <Layouts.Action
        startActions={
          <Filters.Root options={displayedFilters}>
            <Filters.Trigger />
            <Filters.Popover zIndex={499} />
            <Filters.List />
          </Filters.Root>
        }
        endActions={
          canReadAuditLogs ? (
            <Button
              variant="secondary"
              size="S"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={isLoading || results.length === 0}
            >
              {formatMessage({
                id: 'Settings.permissions.auditLogs.export',
                defaultMessage: 'Export',
              })}
            </Button>
          ) : null
        }
      />
      <Layouts.Content>
        <Table.Root rows={results} headers={headers} isLoading={isLoading}>
          <Table.Content>
            <Table.Head>
              {headers.map((header) => (
                <Table.HeaderCell key={header.name} {...header} />
              ))}
            </Table.Head>
            <Table.Empty />
            <Table.Loading />
            <Table.Body>
              {results.map((log) => (
                <Table.Row key={log.id} onClick={() => setQuery({ id: log.id }, 'push', true)}>
                  {headers.map((header) => {
                    const { name, cellFormatter } = header;

                    switch (name) {
                      case 'action':
                        return (
                          <Table.Cell key={name}>
                            <Typography textColor="neutral800">
                              {formatMessage(
                                {
                                  id: `Settings.permissions.auditLogs.${log.action}`,
                                  // @ts-expect-error – getDefaultMessage probably doesn't benefit from being so strongly typed unless we just add string at the end.
                                  defaultMessage: getDefaultMessage(log.action),
                                },
                                { model: (log.payload?.model as string) ?? '' }
                              )}
                            </Typography>
                          </Table.Cell>
                        );
                      case 'date':
                        return (
                          <Table.Cell key={name}>
                            <Typography textColor="neutral800">
                              {formatTimeStamp(log.date)}
                            </Typography>
                          </Table.Cell>
                        );
                      case 'user':
                        return (
                          <Table.Cell key={name}>
                            <Typography textColor="neutral800">
                              {cellFormatter ? cellFormatter(log, header) : '-'}
                            </Typography>
                          </Table.Cell>
                        );
                      default:
                        return (
                          <Table.Cell key={name}>
                            <Typography textColor="neutral800">
                              {(log[name as keyof AuditLog] as string) || '-'}
                            </Typography>
                          </Table.Cell>
                        );
                    }
                  })}
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Flex justifyContent="end">
                      <IconButton
                        onClick={() => setQuery({ id: log.id }, 'push', true)}
                        withTooltip={false}
                        label={formatMessage(
                          { id: 'app.component.table.view', defaultMessage: '{target} details' },
                          { target: `${log.action} action` }
                        )}
                        variant="ghost"
                      >
                        <Eye />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.Root>

        <Pagination.Root {...auditLogs?.pagination}>
          <Pagination.PageSize />
          <Pagination.Links />
        </Pagination.Root>
      </Layouts.Content>
      {query?.id && (
        <Modal
          handleClose={() => setQuery({ id: '' }, 'remove', true)}
          logId={query.id.toString()}
        />
      )}
    </Page.Main>
  );
};

const ProtectedListPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.auditLogs?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <ListPage />
    </Page.Protect>
  );
};

export { ListPage, ProtectedListPage };
