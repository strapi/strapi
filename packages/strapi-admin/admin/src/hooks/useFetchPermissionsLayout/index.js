import { useEffect, useReducer } from 'react';
// TODO
// import { request } from 'strapi-helper-plugin'
import tempData from './utils/tempData';
import reducer, { initialState } from './reducer';

const useFetchPermissionsLayout = () => {
  const [{ data, error, isLoading }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const getData = () => {
      dispatch({
        type: 'GET_DATA',
      });

      return new Promise(resolve => {
        setTimeout(() => {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data: tempData,
          });

          resolve();
        }, 1000);
      });
    };

    getData();
  }, []);

  return { data, error, isLoading };
};

export default useFetchPermissionsLayout;
