import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { useFetchClient } from '@strapi/helper-plugin';
import formatLayouts from './utils/formatLayouts';
import reducer, { initialState } from './reducer';
import { makeSelectModelAndComponentSchemas } from '../../pages/App/selectors';

const useFetchContentTypeLayout = (contentTypeUID) => {
  const [{ error, isLoading, layout, layouts }, dispatch] = useReducer(reducer, initialState);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector((state) => schemasSelector(state), shallowEqual);
  const isMounted = useRef(true);
  const { get } = useFetchClient();

  const getData = useCallback(
    async (uid) => {
      if (layouts[uid]) {
        dispatch({ type: 'SET_LAYOUT_FROM_STATE', uid });

        return;
      }
      dispatch({ type: 'GET_DATA' });

      try {
        const endPoint = `/content-manager/content-types/${uid}/configuration`;

        const {
          data: { data },
        } = await get(endPoint);

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: formatLayouts(data, schemas),
        });
      } catch (error) {
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
    getData(contentTypeUID);

    return () => {
      console.error('Operation canceled by the user.');
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
