import React, { useEffect, useReducer } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import {
  // LoadingIndicator,
  // auth,
  // request,
  useGlobalContext,
} from 'strapi-helper-plugin';
import { Col } from 'reactstrap';
import { Padded } from '@buffetjs/core';
import BaselineAlignement from '../../../components/BaselineAlignement';
import ContainerFluid from '../../../components/ContainerFluid';
import FormBloc from '../../../components/FormBloc';
import SizedInput from '../../../components/SizedInput';
import Header from '../../../components/Users/Header';
import SelectRoles from '../../../components/Users/SelectRoles';
import { editValidation } from '../../../validations/users';
import checkFormValidity from '../../../utils/checkFormValidity';
import form from './utils/form';
import fakeData from './utils/tempData';
import { initialState, reducer } from './reducer';
import init from './init';

const EditPage = () => {
  const { settingsBaseURL } = useGlobalContext();
  const [{ formErrors, isLoading, initialData, modifiedData }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );
  const { formatMessage } = useIntl();
  const {
    params: { id },
  } = useRouteMatch(`${settingsBaseURL}/users/:id`);
  const headerLabelId = isLoading
    ? 'app.containers.Users.EditPage.header.label-loading'
    : 'app.containers.Users.EditPage.header.label';
  const headerLabel = formatMessage({ id: headerLabelId }, { name: 'soup' });

  useEffect(() => {
    const getData = () => {
      return new Promise(resolve => {
        setTimeout(() => {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data: fakeData,
          });

          resolve();
        }, 1000);
      });
    };

    getData();
  }, []);
  console.log({ id });

  const handleCancel = () => {
    dispatch({
      type: 'ON_CANCEL',
    });
  };

  const handleChange = ({ target: { name, value, type: inputType } }) => {
    dispatch({
      type: 'ON_CHANGE',
      inputType,
      keys: name,
      value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const errors = await checkFormValidity(modifiedData, editValidation);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      // todo
      console.log('will submit');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <ContainerFluid padding="0">
          <Header
            isLoading={isLoading}
            initialData={initialData}
            label={headerLabel}
            modifiedData={modifiedData}
            onCancel={handleCancel}
          />
          <BaselineAlignement top size="3px" />
          <FormBloc
            isLoading={isLoading}
            title={formatMessage({
              id: 'app.components.Users.ModalCreateBody.block-title.details',
            })}
          >
            {Object.keys(form).map(key => {
              return (
                <SizedInput
                  {...form[key]}
                  key={key}
                  error={formErrors[key]}
                  name={key}
                  onChange={handleChange}
                  value={get(modifiedData, key, '')}
                />
              );
            })}
          </FormBloc>
          <BaselineAlignement top size="32px" />
          {!isLoading && (
            <FormBloc
              title={formatMessage({ id: 'app.containers.Users.EditPage.roles-bloc-title' })}
            >
              <Col xs="6">
                <Padded top size="sm">
                  <SelectRoles
                    name="roles"
                    onChange={handleChange}
                    error={formErrors.roles}
                    value={get(modifiedData, 'roles', [])}
                  />
                  {/* TODO fix padding for error */}
                  <BaselineAlignement top size="17px" />
                </Padded>
              </Col>
            </FormBloc>
          )}
        </ContainerFluid>
      </form>
    </>
  );
};

export default EditPage;
