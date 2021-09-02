import React from 'react';
import {
  CustomContentLayout,
  LoadingIndicatorPage,
  useRBAC,
  SettingsPageTitle,
  useNotification,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { Button, HeaderLayout, Main } from '@strapi/parts';
import { Mail } from '@strapi/icons';
import { useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import get from 'lodash/get';
import adminPermissions from '../../../permissions';
import DynamicTable from './DynamicTable';
import Filters from './Filters';
import PaginationFooter from './PaginationFooter';
import { deleteData, fetchData } from './utils/api';
import displayedFilters from './utils/displayedFilters';
import tableHeaders from './utils/tableHeaders';

const ListPage = () => {
  const {
    allowedActions: { canCreate, canDelete, canRead, canUpdate },
  } = useRBAC(adminPermissions.settings.users);
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { search } = useLocation();

  const { status, data, isFetching } = useQuery(['users', search], () => fetchData(search), {
    enabled: canRead,
    keepPreviousData: true,
    retry: false,
    staleTime: 5000,
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  useFocusWhenNavigate();

  const total = get(data, 'pagination.total', 0);

  const deleteAllMutation = useMutation(ids => deleteData(ids), {
    onSuccess: async () => {
      await queryClient.invalidateQueries(['users', search]);
    },
    onError: err => {
      if (err?.response?.data?.data) {
        toggleNotification({ type: 'warning', message: err.response.data.data });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      }
    },
  });

  // This can be improved but we need to show an something to the user
  const isLoading =
    (status !== 'success' && status !== 'error') || (status === 'success' && isFetching);

  const createAction = canCreate ? (
    <Button
      data-testid="create-user-button"
      onClick={() => 'handleToggleModalForCreatingRole'}
      startIcon={<Mail />}
    >
      {formatMessage({
        id: 'Settings.permissions.users.create',
        defaultMessage: 'Create new user',
      })}
    </Button>
  ) : (
    undefined
  );

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Users" />
      <HeaderLayout
        id="title"
        primaryAction={createAction}
        title={formatMessage({
          id: 'Settings.permissions.users.listview.header.title',
          defaultMessage: 'Users',
        })}
        subtitle={formatMessage(
          {
            id: 'Settings.permissions.users.listview.header.subtitle',
            defaultMessage: '{number, plural, =0 {# users} one {# user} other {# users}} found',
          },
          { number: total }
        )}
      />
      <CustomContentLayout action={createAction} canRead={canRead}>
        {status === 'error' && <div>TODO: An error occurred</div>}
        {canRead && isLoading ? (
          <LoadingIndicatorPage />
        ) : (
          <>
            <Filters displayedFilters={displayedFilters} />
            <DynamicTable
              canCreate={canCreate}
              canDelete={canDelete}
              canUpdate={canUpdate}
              onConfirmDeleteAll={deleteAllMutation.mutateAsync}
              headers={tableHeaders}
              rows={data?.results}
              withBulkActions
              withMainAction={canDelete}
            />
            <PaginationFooter pagination={data?.pagination} />
          </>
        )}
      </CustomContentLayout>
    </Main>
  );

  // return (
  //   <div>
  //     <SettingsPageTitle name="Users" />
  //     <Header
  //       canCreate={canCreate}
  //       canDelete={canDelete}
  //       canRead={canRead}
  //       count={total}
  //       dataToDelete={dataToDelete}
  //       onClickAddUser={handleToggle}
  //       onClickDelete={handleToggleModal}
  //       isLoading={isLoading}
  //     />
  //     {canRead && (
  //       <>
  //         <BaselineAlignment top size="1px">
  //           <Flex flexWrap="wrap">
  //             <SortPicker onChange={handleChangeSort} value={sort} />
  //             <Padded right size="10px" />
  //             <BaselineAlignment bottom size="6px">
  //               <FilterPicker onChange={handleChangeFilter} />
  //             </BaselineAlignment>
  //             <Padded right size="10px" />
  //             {filters.map((filter, i) => (
  //               // eslint-disable-next-line react/no-array-index-key
  //               <Filter key={i} {...filter} onClick={handleClickDeleteFilter} />
  //             ))}
  //           </Flex>
  //         </BaselineAlignment>
  //         <BaselineAlignment top size="8px" />
  //         <Padded top size="sm">
  //           <List
  //             canDelete={canDelete}
  //             canUpdate={canUpdate}
  //             dataToDelete={dataToDelete}
  //             isLoading={isLoading}
  //             data={data}
  //             onChange={handleChangeDataToDelete}
  //             onClickDelete={handleClickDelete}
  //             searchParam={_q}
  //             filters={filters}
  //             ref={listRef}
  //           />
  //         </Padded>
  //         <Footer
  //           count={total}
  //           onChange={handleChangeFooterParams}
  //           params={{ _limit: pageSize, _page: page }}
  //         />
  //       </>
  //     )}
  //     <ModalForm isOpen={isModalOpened} onClosed={handleCloseModal} onToggle={handleToggle} />
  //     <PopUpWarning
  //       isOpen={isWarningDeleteAllOpened}
  //       onClosed={handleClosedModalDelete}
  //       onConfirm={handleConfirmDeleteData}
  //       toggleModal={handleToggleModal}
  //       isConfirmButtonLoading={showModalConfirmButtonLoading}
  //     />
  //   </div>
  // );
};

export default ListPage;
