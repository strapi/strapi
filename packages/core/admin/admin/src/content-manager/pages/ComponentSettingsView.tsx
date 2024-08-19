import * as React from 'react';

import { CheckPagePermissions, LoadingIndicatorPage, useFetchClient } from '@strapi/helper-plugin';
import axios, { CancelTokenSource } from 'axios';
import { useParams } from 'react-router-dom';

import { useTypedSelector } from '../../core/store/hooks';
import { getData, getDataSucceeded } from '../sharedReducers/crud/actions';
import { reducer, initialState } from '../sharedReducers/crud/reducer';
import { mergeMetasWithSchema } from '../utils/schemas';

import { selectSchemas } from './App';
// @ts-expect-error – This will be done in CONTENT-1952
import EditSettingsView from './EditSettingsView';

const ComponentSettingsView = () => {
  const [{ isLoading, data: layout }, dispatch] = React.useReducer(reducer, initialState);
  const schemas = useTypedSelector(selectSchemas);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const { uid } = useParams<{ uid: string }>();
  const { get } = useFetchClient();

  React.useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const fetchData = async (source: CancelTokenSource) => {
      try {
        dispatch(getData());

        const {
          data: { data },
        } = await get(`/content-manager/components/${uid}/configuration`, {
          cancelToken: source.token,
        });
        dispatch(getDataSucceeded(mergeMetasWithSchema(data, schemas, 'component')));
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }
        console.error(err);
      }
    };

    fetchData(source);

    return () => {
      source.cancel('Operation canceled by the user.');
    };
  }, [uid, schemas, get]);

  if (isLoading || !layout) {
    return <LoadingIndicatorPage />;
  }

  return (
    <CheckPagePermissions permissions={permissions.contentManager?.componentsConfigurations}>
      <EditSettingsView components={layout.components} mainLayout={layout.component} slug={uid} />
    </CheckPagePermissions>
  );
};

export { ComponentSettingsView };
