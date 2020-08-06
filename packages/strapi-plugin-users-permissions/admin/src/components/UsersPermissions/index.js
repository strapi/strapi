import React, { useReducer, useCallback, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Padded, Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import FormCard from '../FormBloc';
import getTrad from '../../utils/getTrad';
import Policies from '../Policies';
import Permissions from '../Permissions';
import reducer, { initialState } from './reducer';
import { UsersPermissionsProvider } from '../../contexts/UsersPermissionsContext';
import init from './init';

const UsersPermissions = forwardRef(({ permissions, routes, policies }, ref) => {
  const { formatMessage } = useIntl();
  const [state, dispatch] = useReducer(reducer, initialState, state =>
    init(state, permissions, routes, policies)
  );

  useImperativeHandle(ref, () => ({
    getPermissions: () => {
      return {
        permissions: state.permissions,
      };
    },
  }));

  const handleSetPluginName = useCallback(pluginName => {
    dispatch({
      type: 'SET_PLUGIN_NAME',
      pluginName,
    });
  }, []);

  const handleSelectedAction = useCallback(actionToSelect => {
    dispatch({
      type: 'SELECT_ACTION',
      actionToSelect,
    });
  }, []);

  const handleSelectPolicy = useCallback(policyName => {
    dispatch({
      type: 'SELECT_POLICY',
      policyName,
    });
  }, []);

  const handleSelectedPermission = useCallback(permissionToSelect => {
    dispatch({
      type: 'SELECT_PERMISSION',
      permissionToSelect,
    });
  }, []);

  const handleSelectSubcategory = useCallback(({ subcategoryPath, shouldEnable }) => {
    dispatch({
      type: 'SELECT_SUBCATEGORY',
      subcategoryPath,
      shouldEnable,
    });
  }, []);

  const providerValue = {
    ...state,
    onSetPluginName: handleSetPluginName,
    onSelectedAction: handleSelectedAction,
    onSelectedPermission: handleSelectedPermission,
    onSelectedPolicy: handleSelectPolicy,
    onSelectedSubcategory: handleSelectSubcategory,
  };

  return (
    <UsersPermissionsProvider value={providerValue}>
      <Flex>
        <FormCard
          title={formatMessage({
            id: getTrad('Plugins.header.title'),
          })}
          subtitle={formatMessage({
            id: getTrad('Plugins.header.description'),
          })}
        >
          <Padded left right size="xs">
            <Permissions />
          </Padded>
        </FormCard>
        <Policies />
      </Flex>
    </UsersPermissionsProvider>
  );
});

UsersPermissions.propTypes = {
  permissions: PropTypes.object.isRequired,
  routes: PropTypes.object.isRequired,
  policies: PropTypes.array.isRequired,
};

export default UsersPermissions;
