import React, { useEffect, useReducer } from 'react';
import { BackHeader, LoadingIndicator, Row, auth, request } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { Padded } from '@buffetjs/core';
import { get, omit } from 'lodash';
import Bloc from '../../components/Bloc';
import BaselineAlignement from '../../components/BaselineAlignement';
import ContainerFluid from '../../components/ContainerFluid';
import SizedInput from '../../components/SizedInput';
import checkFormValidity from '../../utils/checkFormValidity';
import formatAPIErrors from '../../utils/formatAPIErrors';
import { form, schema } from './utils';

import { initialState, reducer } from './reducer';
import init from './init';
import Header from './Header';

const ProfilePage = () => {
  const { goBack } = useHistory();
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderLoader },
    dispatch,
  ] = useReducer(reducer, initialState, init);

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request('/admin/users/me', { method: 'GET' });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        console.log(err.response);
      }
    };

    getData();
  }, []);

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
    const errors = await checkFormValidity(modifiedData, schema);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      try {
        strapi.lockAppWithOverlay();

        dispatch({
          type: 'ON_SUBMIT',
        });

        const { data } = await request('/admin/users/me', {
          method: 'PUT',
          body: omit(modifiedData, ['confirmPassword']),
        });

        // Refresh the localStorage
        auth.setUserInfo(data);

        dispatch({
          type: 'ON_SUBMIT_SUCCEEDED',
          data,
        });
      } catch (err) {
        const data = get(err, 'response.payload', { data: {} });
        const apiErrors = formatAPIErrors(data);

        dispatch({
          type: 'SET_ERRORS',
          errors: apiErrors,
        });
      } finally {
        strapi.unlockApp();
      }
    }
  };

  return (
    <>
      <BackHeader onClick={goBack} />
      <form onSubmit={handleSubmit}>
        <ContainerFluid>
          <Header
            isLoading={showHeaderLoader}
            initialData={initialData}
            modifiedData={modifiedData}
            onCancel={handleCancel}
          />
          <BaselineAlignement top size="3px" />
          <Bloc>
            <BaselineAlignement top size="22px" />
            <Padded left right size="sm">
              {isLoading ? (
                <>
                  <LoadingIndicator />
                  <BaselineAlignement bottom size="22px" />
                </>
              ) : (
                <Row>
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
                </Row>
              )}
            </Padded>
          </Bloc>
        </ContainerFluid>
      </form>
    </>
  );
};

export default ProfilePage;
