import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import axios from 'axios';
import { shallowEqual, useSelector } from 'react-redux';

import { makeSelectModelAndComponentSchemas } from '../../pages/App/selectors';

import reducer, { initialState } from './reducer';
import formatLayouts from './utils/formatLayouts';

const useFetchContentTypeLayout = (contentTypeUID) => {
  const [{ error, isLoading, layout, layouts }, dispatch] = useReducer(reducer, initialState);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector((state) => schemasSelector(state), shallowEqual);
  const isMounted = useRef(true);
  const { get } = useFetchClient();

  const getData = useCallback(
    async (uid, source) => {
      if (layouts[uid]) {
        dispatch({ type: 'SET_LAYOUT_FROM_STATE', uid });

        return;
      }
      dispatch({ type: 'GET_DATA' });

      try {
        const {
          data: { data },
        } = await get(`/content-manager/content-types/${uid}/configuration`, {
          cancelToken: source.token,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: formatLayouts(data, schemas),
        });
      } catch (error) {
        if (axios.isCancel(error)) {
          return;
        }
        if (isMounted.current) {
          console.error(error);
        }

        if (isMounted.current) {
          dispatch({ type: 'GET_DATA_ERROR', error });
        }
      }
    },
    [layouts, schemas, get]
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    getData(contentTypeUID, source);

    return () => {
      source.cancel('Operation canceled by the user.');
    };
  }, [contentTypeUID, getData]);

  const updateLayout = useCallback(
    (data) => {
      dispatch({
        type: 'UPDATE_LAYOUT',
        newLayout: formatLayouts(data, schemas),
      });
    },
    [schemas]
  );

  return {
    error,
    isLoading,
    layout,
    updateLayout,
  };
};

export default useFetchContentTypeLayout;
