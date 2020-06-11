import { useEffect, useReducer } from 'react';
import { hasPermissions, useUser } from 'strapi-helper-plugin';
import { upperFirst } from 'lodash';
import pluginPermissions from '../../permissions';
import reducer, { initialState } from './reducer';
import init from './init';

const useUserPermissions = () => {
  const permissionNames = Object.keys(pluginPermissions);
  const currentUserPermissions = useUser();
  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, permissionNames)
  );

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
        const results = await Promise.all(arrayOfPromises);
        const data = results.reduce((acc, current) => {
          acc[`can${upperFirst(current.permissionName)}`] = current.hasPermission;

          return acc;
        }, {});

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
