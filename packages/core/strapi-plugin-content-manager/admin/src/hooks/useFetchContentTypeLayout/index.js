import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { request } from 'strapi-helper-plugin';
import formatLayouts from './utils/formatLayouts';
import reducer, { initialState } from './reducer';
import { makeSelectModelAndComponentSchemas } from '../../containers/Main/selectors';

const useFetchContentTypeLayout = contentTypeUID => {
  const [{ error, isLoading, layout, layouts }, dispatch] = useReducer(reducer, initialState);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector(state => schemasSelector(state), shallowEqual);
  const isMounted = useRef(true);

  const getData = useCallback(
    async (uid, abortSignal = false) => {
      let signal = abortSignal || new AbortController().signal;

      if (layouts[uid]) {
        dispatch({ type: 'SET_LAYOUT_FROM_STATE', uid });

        return;
      }
      dispatch({ type: 'GET_DATA' });

      try {
        const { data } = await request(`/content-manager/content-types/${uid}/configuration`, {
          method: 'GET',
          signal,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: formatLayouts(data, schemas),
        });
      } catch (error) {
        if (isMounted.current) {
          console.error(error);
        }

        if (isMounted.current && error.name !== 'AbortError') {
          dispatch({ type: 'GET_DATA_ERROR', error });
        }
      }
    },
    [layouts, schemas]
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    getData(contentTypeUID, signal);

    return () => {
      abortController.abort();
    };
  }, [contentTypeUID, getData]);

  const updateLayout = useCallback(
    newLayout => {
      dispatch({
        type: 'UPDATE_LAYOUT',
        newLayout: formatLayouts({ contentType: newLayout, components: {} }, schemas),
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
