import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { useQuery } from 'strapi-helper-plugin';
import { useHistory, useLocation } from 'react-router-dom';
import { Flex, Padded } from '@buffetjs/core';
import BaselineAlignement from '../../../components/BaselineAlignement';
import useSettingsHeaderSearchContext from '../../../hooks/useSettingsHeaderSearchContext';
import Footer from '../../../components/Users/Footer';
import List from '../../../components/Users/List';
import Filter from '../../../components/Users/Filter';
import FilterPicker from '../../../components/Users/FilterPicker';
import SortPicker from '../../../components/Users/SortPicker';
import Header from './Header';
import ModalForm from './ModalForm';
// TODO
import getFilters from './utils/getFilters';
import { pagination as fakeDataPagination, rows } from './utils/tempData';
import init from './init';
import { initialState, reducer } from './reducer';

const ListPage = () => {
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
    },
    dispatch,
  ] = useReducer(reducer, initialState, init);
  const _limit = parseInt(query.get('_limit') || 10, 10);
  const _page = parseInt(query.get('_page') || 1, 10);
  const _sort = decodeURIComponent(query.get('_sort'));
  const _q = decodeURIComponent(query.get('_q') || '');

  useEffect(() => {
    const getData = () => {
      return new Promise(resolve => {
        setTimeout(() => {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data: rows,
            pagination: fakeDataPagination,
          });
          resolve();
        }, 1000);
      });
    };

    getData();
  }, []);

  useEffect(() => {
    toggleHeaderSearch({ id: 'Settings.permissions.menu.link.users.label' });

    return () => {
      toggleHeaderSearch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const paramName = name.split('.')[1];

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

  const handleToggle = () => setIsModalOpened(prev => !prev);

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

  return (
    <div>
      <Header
        count={total}
        dataToDelete={dataToDelete}
        onClickAddUser={handleToggle}
        isLoading={isLoading}
      />
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
      <ModalForm isOpen={isModalOpened} onToggle={handleToggle} />
      <BaselineAlignement top size="8px" />
      <Padded top size="sm">
        <List
          isLoading={isLoading}
          data={data}
          onChange={handleChangeDataToDelete}
          searchParam={_q}
          filters={filters}
        />
      </Padded>
      <Footer count={total} onChange={handleChangeFooterParams} params={{ _limit, _page }} />
    </div>
  );
};

export default ListPage;
