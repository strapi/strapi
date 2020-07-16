import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  useQuery,
  request,
  useUserPermissions,
  LoadingIndicatorPage,
  PopUpWarning,
} from 'strapi-helper-plugin';
import { get } from 'lodash';
import { useHistory, useLocation } from 'react-router-dom';
import { Flex, Padded } from '@buffetjs/core';
import BaselineAlignement from '../../../components/BaselineAlignement';
import PageTitle from '../../../components/SettingsPageTitle';
import { useSettingsHeaderSearchContext } from '../../../hooks';
import { Footer, List, Filter, FilterPicker, SortPicker } from '../../../components/Users';
import adminPermissions from '../../../permissions';
import Header from './Header';
import ModalForm from './ModalForm';
import getFilters from './utils/getFilters';
import init from './init';
import { initialState, reducer } from './reducer';

const ListPage = () => {
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canDelete, canRead, canUpdate },
  } = useUserPermissions(adminPermissions.settings.users);
  const [isWarningDeleteAllOpened, setIsWarningDeleteAllOpened] = useState(false);
  const [isModalOpened, setIsModalOpened] = useState(false);
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const query = useQuery();
  const { push } = useHistory();
  const { search } = useLocation();
  const filters = useMemo(() => {
    return getFilters(search);
  }, [search]);

  const [
    {
      data,
      dataToDelete,
      isLoading,
      pagination: { total },
      shouldRefetchData,
      showModalConfirmButtonLoading,
    },
    dispatch,
  ] = useReducer(reducer, initialState, init);
  const pageSize = parseInt(query.get('pageSize') || 10, 10);
  const page = parseInt(query.get('page') || 0, 10);
  const _sort = decodeURIComponent(query.get('_sort'));
  const _q = decodeURIComponent(query.get('_q') || '');
  const getDataRef = useRef();
  const listRef = useRef();

  getDataRef.current = async () => {
    if (!canRead) {
      dispatch({
        type: 'UNSET_IS_LOADING',
      });

      return;
    }
    // Show the loading state and reset the state
    dispatch({
      type: 'GET_DATA',
    });

    try {
      const {
        data: { results, pagination },
      } = await request(`/admin/users${search}`, { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data: results,
        pagination,
      });
    } catch (err) {
      console.error(err.response);
      strapi.notification.error('notification.error');
    }
  };

  useEffect(() => {
    if (!isLoadingForPermissions) {
      getDataRef.current();
    }
  }, [search, isLoadingForPermissions]);

  useEffect(() => {
    if (canRead) {
      toggleHeaderSearch({ id: 'Settings.permissions.menu.link.users.label' });
    }

    return () => {
      if (canRead) {
        toggleHeaderSearch();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const handleChangeDataToDelete = ids => {
    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      dataToDelete: ids,
    });
  };

  const handleChangeFilter = ({ filter, name, value }) => {
    const filterName = `${name}${filter}`;

    updateSearchParams(filterName, encodeURIComponent(value), true);
  };

  const handleChangeFooterParams = ({ target: { name, value } }) => {
    let paramName = name.split('.')[1].replace('_', '');

    if (paramName === 'limit') {
      paramName = 'pageSize';
    }

    updateSearchParams(paramName, value);
  };

  const handleChangeSort = ({ target: { name, value } }) => {
    updateSearchParams(name, value);
  };

  const handleClickDeleteFilter = ({ target: { name } }) => {
    const currentSearch = new URLSearchParams(search);

    currentSearch.delete(name);

    push({ search: currentSearch.toString() });
  };

  const handleClickDelete = useCallback(id => {
    handleToggleModal();

    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      dataToDelete: [id],
    });
  }, []);

  const handleCloseModal = () => {
    // Refetch data
    getDataRef.current();
  };

  const handleClosedModalDelete = () => {
    if (shouldRefetchData) {
      getDataRef.current();
    } else {
      // Empty the selected ids when the modal closes
      dispatch({
        type: 'RESET_DATA_TO_DELETE',
      });

      // Reset the list's reducer dataToDelete state using a ref so we don't need an effect
      listRef.current.resetDataToDelete();
    }
  };

  const handleConfirmDeleteData = useCallback(async () => {
    dispatch({
      type: 'ON_DELETE_USERS',
    });

    let shouldDispatchSucceededAction = false;

    try {
      await request('/admin/users/batch-delete', {
        method: 'POST',
        body: {
          ids: dataToDelete,
        },
      });
      shouldDispatchSucceededAction = true;
    } catch (err) {
      const errorMessage = get(err, 'response.payload.data', 'An error occured');

      strapi.notification.error(errorMessage);
    }

    // Only dispatch the action once
    if (shouldDispatchSucceededAction) {
      dispatch({
        type: 'ON_DELETE_USERS_SUCCEEDED',
      });
    }

    handleToggleModal();
  }, [dataToDelete]);

  const handleToggle = () => setIsModalOpened(prev => !prev);

  const handleToggleModal = () => setIsWarningDeleteAllOpened(prev => !prev);

  const updateSearchParams = (name, value, shouldDeleteSearch = false) => {
    const currentSearch = new URLSearchParams(search);
    // Update the currentSearch
    currentSearch.set(name, value);

    if (shouldDeleteSearch) {
      currentSearch.delete('_q');
    }

    push({
      search: currentSearch.toString(),
    });
  };

  if (isLoadingForPermissions) {
    return <LoadingIndicatorPage />;
  }

  return (
    <div>
      <PageTitle name="Users" />
      <Header
        canCreate={canCreate}
        canDelete={canDelete}
        canRead={canRead}
        count={total}
        dataToDelete={dataToDelete}
        onClickAddUser={handleToggle}
        onClickDelete={handleToggleModal}
        isLoading={isLoading}
      />
      {canRead && (
        <>
          <BaselineAlignement top size="1px">
            <Flex flexWrap="wrap">
              <SortPicker onChange={handleChangeSort} value={_sort} />
              <Padded right size="10px" />
              <BaselineAlignement bottom size="6px">
                <FilterPicker onChange={handleChangeFilter} />
              </BaselineAlignement>
              <Padded right size="10px" />
              {filters.map((filter, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <Filter key={i} {...filter} onClick={handleClickDeleteFilter} />
              ))}
            </Flex>
          </BaselineAlignement>
          <BaselineAlignement top size="8px" />
          <Padded top size="sm">
            <List
              canDelete={canDelete}
              canUpdate={canUpdate}
              dataToDelete={dataToDelete}
              isLoading={isLoading}
              data={data}
              onChange={handleChangeDataToDelete}
              onClickDelete={handleClickDelete}
              searchParam={_q}
              filters={filters}
              ref={listRef}
            />
          </Padded>
          <Footer
            count={total}
            onChange={handleChangeFooterParams}
            params={{ _limit: pageSize, _page: page }}
          />
        </>
      )}
      <ModalForm isOpen={isModalOpened} onClosed={handleCloseModal} onToggle={handleToggle} />
      <PopUpWarning
        isOpen={isWarningDeleteAllOpened}
        onClosed={handleClosedModalDelete}
        onConfirm={handleConfirmDeleteData}
        toggleModal={handleToggleModal}
        isConfirmButtonLoading={showModalConfirmButtonLoading}
      />
    </div>
  );
};

export default ListPage;
