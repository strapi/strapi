import React, { useEffect, useReducer } from 'react';
import { BackHeader, auth, request } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { get, omit } from 'lodash';
import BaselineAlignement from '../../components/BaselineAlignement';
import ContainerFluid from '../../components/ContainerFluid';
import FormBloc from '../../components/FormBloc';
import SizedInput from '../../components/SizedInput';
import Header from '../../components/Users/Header';
import checkFormValidity from '../../utils/checkFormValidity';
import formatAPIErrors from '../../utils/formatAPIErrors';
import { form, schema } from './utils';
import { initialState, reducer } from './reducer';
import init from './init';

const ProfilePage = () => {
  const { goBack } = useHistory();
  const [
    { formErrors, initialData, isLoading, modifiedData, showHeaderLoader },
    dispatch,
  ] = useReducer(reducer, initialState, init);
  const userInfos = auth.getUserInfo();
  const headerLabel = userInfos.username || `${userInfos.firstname} ${userInfos.lastname}`;

  useEffect(() => {
    const getData = async () => {
      try {
        const { data } = await request('/admin/users/me', { method: 'GET' });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        console.error(err.response);
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
            label={headerLabel}
            modifiedData={modifiedData}
            onCancel={handleCancel}
          />
          <BaselineAlignement top size="3px" />
          <FormBloc isLoading={isLoading}>
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
        </ContainerFluid>
      </form>
    </>
  );
};

export default ProfilePage;
