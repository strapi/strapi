import React, { useReducer } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
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
import { initialState, reducer } from './reducer';
import init from './init';

const EditPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const [{ isLoading }, dispatch] = useReducer(reducer, initialState, init);
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/users/:id`);
  const headerLabelId = isLoading
    ? 'app.containers.Users.EditPage.header.label-loading'
    : 'app.containers.Users.EditPage.header.label';
  const headerLabel = formatMessage({ id: headerLabelId }, { name: 'soup' });
  console.log({ dispatch, id });

  const handleSubmit = e => {
    e.preventDefault();
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <ContainerFluid padding="0">
          <Header
            isLoading={isLoading}
            initialData={{}}
            label={headerLabel}
            modifiedData={{}}
            onCancel={() => {}}
          />
        </ContainerFluid>
      </form>
    </>
  );
};

export default EditPage;
