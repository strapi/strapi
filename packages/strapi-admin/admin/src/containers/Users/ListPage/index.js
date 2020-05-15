import React, { useEffect, useState } from 'react';
import useSettingsHeaderSearchContext from '../../../hooks/useSettingsHeaderSearchContext';
import Header from './Header';
import ModalForm from './ModalForm';

const ListPage = () => {
  const [isModalOpened, setIsModalOpened] = useState(false);
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();

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

  return (
    <div>
      <Header count={usersCount} onClickAddUser={handleToggle} />
      <ModalForm isOpen={isModalOpened} onToggle={handleToggle} />
    </div>
  );
};

export default ListPage;
