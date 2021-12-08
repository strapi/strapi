import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import axios from 'axios';
import { axiosInstance } from '../../../core/utils';
import formatLayouts from './utils/formatLayouts';
import reducer, { initialState } from './reducer';
import { makeSelectModelAndComponentSchemas } from '../../pages/App/selectors';
import { getRequestUrl } from '../../utils';

const useFetchContentTypeLayout = contentTypeUID => {
  const [{ error, isLoading, layout, layouts }, dispatch] = useReducer(reducer, initialState);
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector(state => schemasSelector(state), shallowEqual);
  const isMounted = useRef(true);

  const getData = useCallback(
    async (uid, source) => {
      if (layouts[uid]) {
        dispatch({ type: 'SET_LAYOUT_FROM_STATE', uid });

        return;
      }
      dispatch({ type: 'GET_DATA' });

      try {
        const endPoint = getRequestUrl(`content-types/${uid}/configuration`);

        const {
          data: { data },
        } = await axiosInstance.get(endPoint, { cancelToken: source.token });

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
    [layouts, schemas]
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
