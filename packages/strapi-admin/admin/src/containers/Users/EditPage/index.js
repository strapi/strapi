import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';

const EditPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/users/:id`);

  return (
    <div>
      <h1>Users edit page</h1>
      <h2>User id : {id} </h2>
      <p>Coming soon</p>
    </div>
  );
};

export default EditPage;
