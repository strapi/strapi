import React, { memo, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { request, LoadingIndicatorPage } from 'strapi-helper-plugin';
import DataManagerContext from '../../contexts/DataManagerContext';
import pluginId from '../../pluginId';
import init from './init';
import reducer, { initialState } from './reducer';
import createDataObject from './utils/createDataObject';

const DataManagerProvider = ({ children }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { components, contentTypes, isLoading } = reducerState.toJS();

  const abortController = new AbortController();
  const { signal } = abortController;
  const getDataRef = useRef();

  getDataRef.current = async () => {
    const [
      { data: componentsArray },
      { data: contentTypesArray },
    ] = await Promise.all(
      ['components', 'content-types'].map(endPoint => {
        return request(`/${pluginId}/${endPoint}`, {
          method: 'GET',
          signal,
        });
      })
    );

    dispatch({
      type: 'GET_DATA_SUCCEEDED',
      components: createDataObject(componentsArray),
      contentTypes: createDataObject(contentTypesArray),
    });
  };

  useEffect(() => {
    getDataRef.current();
  }, []);

  return (
    <DataManagerContext.Provider
      value={{
        components,
        contentTypes,
      }}
    >
      {isLoading ? <LoadingIndicatorPage /> : children}
    </DataManagerContext.Provider>
  );
};

DataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default memo(DataManagerProvider);
