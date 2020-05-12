import React from 'react';
import { Link } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';

const ListPage = () => {
  const { settingsBaseURL } = useGlobalContext();

  return (
    <div>
      <h1>Roles list page</h1>
      <p>Coming soon</p>
      <Link to={`${settingsBaseURL}/roles/new`}> Create Role</Link>
      <Link to={`${settingsBaseURL}/roles/1`}> Edit Role</Link>
    </div>
  );
};

export default ListPage;
