import React, { useEffect, useReducer } from 'react';
import { BackHeader, LoadingIndicator, Row, request } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { Padded } from '@buffetjs/core';
import { get } from 'lodash';
import Bloc from '../../components/Bloc';
import BaselineAlignement from '../../components/BaselineAlignement';
import ContainerFluid from '../../components/ContainerFluid';
import SizedInput from '../../components/SizedInput';
import form from './utils/form';
import { initialState, reducer } from './reducer';
import init from './init';
import Header from './Header';

const ProfilePage = () => {
  const { goBack } = useHistory();
  const [{ initialData, isLoading, modifiedData }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );

  useEffect(() => {
    const getData = async () => {
      try {
        const data = await request('/users/me', { method: 'GET' });

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
  };

  return (
    <>
      <BackHeader onClick={goBack} />
      <form onSubmit={handleSubmit}>
        <ContainerFluid>
          <Header
            isLoading={isLoading}
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
