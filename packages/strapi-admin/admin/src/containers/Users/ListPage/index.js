import React from 'react';
import { Link } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';

const ListPage = () => {
  const { settingsBaseURL } = useGlobalContext();

  return (
    <div>
      <h1>Users list page</h1>
      <p>Coming soon</p>
      <Link to={`${settingsBaseURL}/users/1`}>Edit user 1</Link>
    </div>
  );
};

export default ListPage;
