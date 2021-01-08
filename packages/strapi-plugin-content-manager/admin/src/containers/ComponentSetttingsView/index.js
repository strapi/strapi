import React, { memo, useEffect, useMemo, useReducer } from 'react';
import { useParams } from 'react-router-dom';
import { CheckPagePermissions, LoadingIndicatorPage, request } from 'strapi-helper-plugin';
import { useSelector } from 'react-redux';
import { getRequestUrl, mergeMetasWithSchema } from '../../utils';
import { makeSelectModelAndComponentSchemas } from '../Main/selectors';
import pluginPermissions from '../../permissions';
import { crudInitialState, crudReducer } from '../../sharedReducers';
import EditSettingsView from '../EditSettingsView';

const ComponentSettingsView = () => {
  const [{ isLoading, data: layout }, dispatch] = useReducer(crudReducer, crudInitialState);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector(state => schemasSelector(state), []);
  const { uid } = useParams();

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const getData = async signal => {
      try {
        dispatch({ type: 'GET_DATA' });

        const { data } = await request(getRequestUrl(`components/${uid}/configuration`), {
          method: 'GET',
          signal,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: mergeMetasWithSchema(data, schemas, 'component'),
        });
      } catch (err) {
        console.error(err);
      }
    };

    getData(signal);

    return () => {
      abortController.abort();
    };
  }, [uid, schemas]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <CheckPagePermissions permissions={pluginPermissions.componentsConfigurations}>
      <EditSettingsView components={layout.components} mainLayout={layout.component} slug={uid} />
    </CheckPagePermissions>
  );
};

export default memo(ComponentSettingsView);
