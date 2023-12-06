import React, { memo, useEffect, useReducer } from 'react';

import { CheckPagePermissions, LoadingIndicatorPage, useFetchClient } from '@strapi/helper-plugin';
import axios from 'axios';
import { useParams } from 'react-router-dom';

import { useTypedSelector } from '../../../core/store/hooks';
import { selectAdminPermissions } from '../../../selectors';
import { getData, getDataSucceeded } from '../../sharedReducers/crud/actions';
import { reducer, initialState } from '../../sharedReducers/crud/reducer';
import { mergeMetasWithSchema } from '../../utils/schemas';
import { selectModelAndComponentSchemas } from '../App/reducer';
import EditSettingsView from '../EditSettingsView';

const ComponentSettingsView = () => {
  console.log(reducer);
  const [{ isLoading, data: layout }, dispatch] = useReducer(reducer, initialState);
  const { schemas } = useTypedSelector(selectModelAndComponentSchemas);
  const permissions = useTypedSelector(selectAdminPermissions);
  const { uid } = useParams();
  const { get } = useFetchClient();

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const fetchData = async (source) => {
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

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <CheckPagePermissions permissions={permissions.contentManager.componentsConfigurations}>
      <EditSettingsView components={layout.components} mainLayout={layout.component} slug={uid} />
    </CheckPagePermissions>
  );
};

export default memo(ComponentSettingsView);
