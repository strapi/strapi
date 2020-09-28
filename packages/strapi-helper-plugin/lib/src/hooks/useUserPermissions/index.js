import { useEffect, useMemo, useReducer, useRef } from 'react';
import hasPermissions from '../../utils/hasPermissions';
import useUser from '../useUser';

import generateResultsObject from './utils/generateResultsObject';
import reducer from './reducer';
import init from './init';

const useUserPermissions = pluginPermissions => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const isMounted = useRef(true);
  const permissionNames = useMemo(() => {
    return Object.keys(pluginPermissions);
  }, [pluginPermissions]);
  const currentUserPermissions = useUser();
  const [state, dispatch] = useReducer(reducer, {}, () => init(permissionNames));
  const checkPermissionsRef = useRef();
  const generateArrayOfPromisesRef = useRef();

  checkPermissionsRef.current = async permissionName => {
    const hasPermission = await hasPermissions(
      currentUserPermissions,
      pluginPermissions[permissionName],
      signal
    );

    return { permissionName, hasPermission };
  };

  generateArrayOfPromisesRef.current = array =>
    array.map(permissionName => checkPermissionsRef.current(permissionName));

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
          permissionNames,
        });
        const arrayOfPromises = generateArrayOfPromisesRef.current(permissionNames);
        const results = await Promise.all(arrayOfPromises);
        const data = generateResultsObject(results);

        if (isMounted.current) {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data,
          });
        }
      } catch (err) {
        // Silent
      }
    };

    getData();

    return () => {
      abortController.abort();
    };
  }, [permissionNames]);

  // This function is used to synchronise the hook when used in dynamic components
  const setIsLoading = () => {
    dispatch({
      type: 'SET_IS_LOADING',
    });
  };

  return { ...state, setIsLoading };
};

export default useUserPermissions;
