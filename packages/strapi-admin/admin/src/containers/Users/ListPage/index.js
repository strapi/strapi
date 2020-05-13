import React, { useState } from 'react';
import Header from './Header';
import ModalForm from './ModalForm';

const ListPage = () => {
  const [isModalOpened, setIsModalOpened] = useState(true);
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
