import React, { memo, useEffect, useMemo, useReducer } from 'react';
import { useParams } from 'react-router-dom';
import { CheckPagePermissions, LoadingIndicatorPage, useFetchClient } from '@strapi/helper-plugin';
import { useSelector, shallowEqual } from 'react-redux';
import axios from 'axios';
import { getRequestUrl, mergeMetasWithSchema } from '../../utils';
import { makeSelectModelAndComponentSchemas } from '../App/selectors';
import permissions from '../../../permissions';
import crudReducer, { crudInitialState } from '../../sharedReducers/crudReducer/reducer';
import { getData, getDataSucceeded } from '../../sharedReducers/crudReducer/actions';
import EditSettingsView from '../EditSettingsView';

const cmPermissions = permissions.contentManager;

const ComponentSettingsView = () => {
  const [{ isLoading, data: layout }, dispatch] = useReducer(crudReducer, crudInitialState);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector((state) => schemasSelector(state), shallowEqual);
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
        } = await get(getRequestUrl(`components/${uid}/configuration`), {
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
    <CheckPagePermissions permissions={cmPermissions.componentsConfigurations}>
      <EditSettingsView components={layout.components} mainLayout={layout.component} slug={uid} />
    </CheckPagePermissions>
  );
};

export default memo(ComponentSettingsView);
