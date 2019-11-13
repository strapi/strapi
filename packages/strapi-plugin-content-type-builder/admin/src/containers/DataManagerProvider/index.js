import React, { memo, useEffect, useReducer } from 'react';
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
  const { components, contentTypes, isLoading } = reducerState.toJS();

  useEffect(() => {
    const getData = async () => {
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

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log({ contentTypes, components });

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
