import { useEffect, useMemo, useReducer, useRef } from 'react';
import hasPermissions from '../../utils/hasPermissions';
import useUser from '../useUser';

import generateResultsObject from './utils/generateResultsObject';
import reducer, { initialState } from './reducer';
import init from './init';

const useUserPermissions = pluginPermissions => {
  const permissionNames = useMemo(() => {
    return Object.keys(pluginPermissions);
  }, [pluginPermissions]);
  const currentUserPermissions = useUser();
  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, permissionNames)
  );
  const checkPermissionsRef = useRef();
  const generateArrayOfPromisesRef = useRef();

  checkPermissionsRef.current = async permissionName => {
    const hasPermission = await hasPermissions(
      currentUserPermissions,
      pluginPermissions[permissionName]
    );

    return { permissionName, hasPermission };
  };

  generateArrayOfPromisesRef.current = array =>
    array.map(permissionName => checkPermissionsRef.current(permissionName));

  useEffect(() => {
    const getData = async () => {
      try {
        const arrayOfPromises = generateArrayOfPromisesRef.current(permissionNames);
        const results = await Promise.all(arrayOfPromises);
        const data = generateResultsObject(results);

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        console.error(err);
      }
    };

    getData();
  }, [permissionNames]);

  return state;
};

export default useUserPermissions;
