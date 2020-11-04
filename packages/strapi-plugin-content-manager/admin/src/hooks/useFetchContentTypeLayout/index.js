import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { request } from 'strapi-helper-plugin';
import formatLayouts from './utils/formatLayouts';
import reducer, { initialState } from './reducer';
import {
  makeSelectModels,
  makeSelectModelAndComponentSchemas,
} from '../../containers/Main/selectors';

const useFetchContentTypeLayout = contentTypeUID => {
  const [{ error, isLoading, layout, layouts }, dispatch] = useReducer(reducer, initialState);
  // const modelsSelector = useMemo(makeSelectModels, []);
  // const models = useSelector(state => modelsSelector(state), []);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector(state => schemasSelector(state), []);
  console.log({ layouts, layout });

  const getData = useCallback(
    async (uid, abortSignal = false) => {
      let signal = abortSignal || new AbortController().signal;
      console.log('infi lopp');

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
        console.error(error);
        dispatch({ type: 'GET_DATA_ERROR', error });
      }
    },
    [schemas, layouts]
  );

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    getData(contentTypeUID, signal);

    return () => abortController.abort();
  }, [contentTypeUID, getData]);

  return {
    error,
    isLoading,
    layout,
  };
};

export default useFetchContentTypeLayout;
