import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import {
  // BackHeader,
  // LoadingIndicator,
  // Row,
  // auth,
  // request,
  useGlobalContext,
} from 'strapi-helper-plugin';
import ContainerFluid from '../../../components/ContainerFluid';
import Header from '../../../components/Users/Header';

const EditPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/users/:id`);
  console.log({ id });

  const handleSubmit = e => {
    e.preventDefault();
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <ContainerFluid padding="0">
          <Header
            isLoading={false}
            initialData={{}}
            label="Edit"
            modifiedData={{}}
            onCancel={() => {}}
          />
        </ContainerFluid>
      </form>
    </>
  );
};

export default EditPage;
