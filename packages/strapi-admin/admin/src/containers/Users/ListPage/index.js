import React, { useEffect, useReducer, useState } from 'react';
import useSettingsHeaderSearchContext from '../../../hooks/useSettingsHeaderSearchContext';
import List from '../../../components/Users/List';
import Header from './Header';
import ModalForm from './ModalForm';
// TODO
import { rows } from './utils/tempData';
import init from './init';
import { initialState, reducer } from './reducer';

const ListPage = () => {
  const [isModalOpened, setIsModalOpened] = useState(false);
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const [{ data, dataToDelete, isLoading }, dispatch] = useReducer(reducer, initialState, init);

  useEffect(() => {
    const getData = () => {
      return new Promise(resolve => {
        setTimeout(() => {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data: rows,
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

  // TODO when API ready
  const usersCount = 1;
  const handleToggle = () => setIsModalOpened(prev => !prev);

  const handleChangeDataToDelete = ids => {
    dispatch({
      type: 'ON_CHANGE_DATA_TO_DELETE',
      dataToDelete: ids,
    });
  };

  return (
    <div>
      <Header
        count={usersCount}
        dataToDelete={dataToDelete}
        onClickAddUser={handleToggle}
        isLoading={isLoading}
      />
      <ModalForm isOpen={isModalOpened} onToggle={handleToggle} />
      <div style={{ height: 37 }} />
      <List isLoading={isLoading} data={data} onChange={handleChangeDataToDelete} />
    </div>
  );
};

export default ListPage;
