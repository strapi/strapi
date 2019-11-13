import React, { useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { request, LoadingIndicatorPage } from 'strapi-helper-plugin';
import DataManagerContext from '../../contexts/DataManagerContext';
import pluginId from '../../pluginId';
import init from './init';
import reducer, { initialState } from './reducer';
import createDataObject from './utils/createDataObject';

const DataManagerProvider = ({ children }) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { isLoading } = reducerState.toJS();

  useEffect(() => {
    const getData = async () => {
      const [{ data: componentsArray }] = await Promise.all(
        ['components'].map(endPoint => {
          return request(`/${pluginId}/${endPoint}`, {
            method: 'GET',
            signal,
          });
        })
      );

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        components: createDataObject(componentsArray),
      });
    };

    getData();
  }, [signal]);

  return (
    <DataManagerContext.Provider>
      {isLoading ? <LoadingIndicatorPage /> : children}
    </DataManagerContext.Provider>
  );
};

DataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DataManagerProvider;
