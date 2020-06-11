import { useEffect, useReducer } from 'react';
import { hasPermissions, useUser } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import reducer, { initialState } from './reducer';

const useUserPermissions = () => {
  const permissionNames = Object.keys(pluginPermissions);
  const currentUserPermissions = useUser();
  const [state, dispatch] = useReducer(reducer, initialState);

  const checkPermissions = async permissionName => {
    const hasPermission = await hasPermissions(
      currentUserPermissions,
      pluginPermissions[permissionName]
    );

    return { permissionName, hasPermission };
  };

  const generateArrayOfPromises = array =>
    array.map(permissionName => checkPermissions(permissionName));

  const arrayOfPromises = generateArrayOfPromises(permissionNames);

  useEffect(() => {
    const getData = async () => {
      try {
        const data = await Promise.all(arrayOfPromises);

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        console.error(err);
      }
    };

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
};

export default useUserPermissions;
