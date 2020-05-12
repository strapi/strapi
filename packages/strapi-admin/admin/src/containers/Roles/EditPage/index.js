import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';

const EditPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/roles/:id`);

  return (
    <div>
      <h1>Roles edit page</h1>
      <h2>Role id : {id} </h2>
      <p>Coming soon</p>
    </div>
  );
};

export default EditPage;
