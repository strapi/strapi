import React, { useState } from 'react';
import {
  DynamicTable,
  SearchURLQuery,
  SettingsPageTitle,
  useRBAC,
  useNotification,
  useFocusWhenNavigate,
  NoPermissions,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import {
  ActionLayout,
  ContentLayout,
  HeaderLayout,
  Main,
  useNotifyAT,
} from '@strapi/design-system';
import { useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import CreateAction from 'ee_else_ce/pages/SettingsPage/pages/Users/ListPage/CreateAction';
import useLicenseLimitNotification from 'ee_else_ce/hooks/useLicenseLimitNotification';
import adminPermissions from '../../../../../permissions';
import TableRows from './DynamicTable/TableRows';
import Filters from '../../../components/Filters';
import ModalForm from './ModalForm';
import PaginationFooter from './PaginationFooter';
import { deleteData, fetchData } from './utils/api';
import displayedFilters from './utils/displayedFilters';
import tableHeaders from './utils/tableHeaders';

const ListPage = () => {
  const { formatAPIError } = useAPIErrorHandler();
  const [isModalOpened, setIsModalOpen] = useState(false);
  const {
    allowedActions: { canCreate, canDelete, canRead },
  } = useRBAC(adminPermissions.settings.users);
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();
  useFocusWhenNavigate();
  useLicenseLimitNotification();
  const { notifyStatus } = useNotifyAT();
  const queryName = ['users', search];

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  const title = formatMessage({
    id: 'global.users',
    defaultMessage: 'Users',
  });

  const notifyLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: title }
      )
    );
  };

  const { status, data, isFetching } = useQuery(queryName, () => fetchData(search, notifyLoad), {
    enabled: canRead,
    retry: false,
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          message: formatAPIError(error),
          defaultMessage: 'An error occured',
        },
      });
    },
  });

  const handleToggle = () => {
    setIsModalOpen((prev) => !prev);
  };

  const deleteAllMutation = useMutation((ids) => deleteData(ids), {
    async onSuccess() {
      await queryClient.refetchQueries(queryName);

      // Toggle enabled/ disabled state on the invite button
      await queryClient.refetchQueries(['ee', 'license-limit-info']);
    },
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          message: formatAPIError(error),
          defaultMessage: 'An error occured',
        },
      });
    },
  });

  // This can be improved but we need to show an something to the user
  const isLoading =
    (status !== 'success' && status !== 'error') || (status === 'success' && isFetching);

  return (
    <Main aria-busy={isLoading}>
      <SettingsPageTitle name="Users" />
      <HeaderLayout
        primaryAction={canCreate && <CreateAction onClick={handleToggle} />}
        title={title}
        subtitle={formatMessage({
          id: 'Settings.permissions.users.listview.header.subtitle',
          defaultMessage: 'All the users who have access to the Strapi admin panel',
        })}
      />
      {canRead && (
        <ActionLayout
          startActions={
            <>
              <SearchURLQuery
                label={formatMessage(
                  { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                  { target: title }
                )}
              />
              <Filters displayedFilters={displayedFilters} />
            </>
          }
        />
      )}

      <ContentLayout canRead={canRead}>
        {!canRead && <NoPermissions />}
        {status === 'error' && <div>TODO: An error occurred</div>}
        {canRead && (
          <>
            <DynamicTable
              contentType="Users"
              isLoading={isLoading}
              onConfirmDeleteAll={deleteAllMutation.mutateAsync}
              onConfirmDelete={(id) => deleteAllMutation.mutateAsync([id])}
              headers={headers}
              rows={data?.results}
              withBulkActions
              withMainAction={canDelete}
            >
              <TableRows
                canDelete={canDelete}
                headers={headers}
                rows={data?.results || []}
                withBulkActions
                withMainAction={canDelete}
              />
            </DynamicTable>
            <PaginationFooter pagination={data?.pagination} />
          </>
        )}
      </ContentLayout>
      {isModalOpened && <ModalForm onToggle={handleToggle} queryName={queryName} />}
    </Main>
  );
};

export default ListPage;
