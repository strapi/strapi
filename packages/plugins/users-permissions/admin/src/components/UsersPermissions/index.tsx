import React, { forwardRef, memo, useImperativeHandle, useReducer } from 'react';

import { Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { UsersPermissionsProvider } from '../../contexts/UsersPermissionsContext';
import getTrad from '../../utils/getTrad';
import Permissions from '../Permissions';
import Policies from '../Policies';

import init from './init';
import reducer, { initialState } from './reducer';

interface UsersPermissionsProps {
  permissions: Record<string, any>;
  routes: Record<string, any>;
}

export interface UsersPermissionsHandle {
  getPermissions: () => { permissions: Record<string, any> };
  resetForm: () => void;
  setFormAfterSubmit: () => void;
}

interface UsersPermissionsState {
  initialData: Record<string, any>;
  modifiedData: Record<string, any>;
  routes: Record<string, any>;
  selectedAction: string;
  policies: any[];
}

const UsersPermissions = forwardRef<UsersPermissionsHandle, UsersPermissionsProps>(
  ({ permissions, routes }, ref) => {
    const { formatMessage } = useIntl();
    const [state, dispatch] = useReducer<
      React.Reducer<UsersPermissionsState, any>,
      UsersPermissionsState
    >(
      reducer as unknown as React.Reducer<UsersPermissionsState, any>,
      initialState as UsersPermissionsState,
      (s) => init(s, permissions, routes)
    );

    useImperativeHandle(ref, () => ({
      getPermissions() {
        return {
          permissions: state.modifiedData,
        };
      },
      resetForm() {
        dispatch({ type: 'ON_RESET' });
      },
      setFormAfterSubmit() {
        dispatch({ type: 'ON_SUBMIT_SUCCEEDED' });
      },
    }));

    const handleChange = ({ target: { name, value } }: { target: { name: string; value: any } }) =>
      dispatch({
        type: 'ON_CHANGE',
        keys: name.split('.'),
        value: value === 'empty__string_value' ? '' : value,
      });

    const handleChangeSelectAll = ({
      target: { name, value },
    }: {
      target: { name: string; value: any };
    }) =>
      dispatch({
        type: 'ON_CHANGE_SELECT_ALL',
        keys: name.split('.'),
        value,
      });

    const handleSelectedAction = (actionToSelect: string) =>
      dispatch({
        type: 'SELECT_ACTION',
        actionToSelect,
      });

    const providerValue = {
      ...state,
      onChange: handleChange,
      onChangeSelectAll: handleChangeSelectAll,
      onSelectedAction: handleSelectedAction,
    };

    return (
      <UsersPermissionsProvider value={providerValue}>
        <Grid.Root gap={0} shadow="filterShadow" hasRadius background="neutral0">
          <Grid.Item
            col={7}
            xs={12}
            paddingTop={6}
            paddingBottom={6}
            paddingLeft={7}
            paddingRight={7}
            direction="column"
            alignItems="stretch"
          >
            <Flex direction="column" alignItems="stretch" gap={6}>
              <Flex direction="column" alignItems="stretch" gap={2}>
                <Typography variant="delta" tag="h2">
                  {formatMessage({
                    id: getTrad('Plugins.header.title'),
                    defaultMessage: 'Permissions',
                  })}
                </Typography>
                <Typography tag="p" textColor="neutral600">
                  {formatMessage({
                    id: getTrad('Plugins.header.description'),
                    defaultMessage: 'Only actions bound by a route are listed below.',
                  })}
                </Typography>
              </Flex>
              <Permissions />
            </Flex>
          </Grid.Item>
          <Policies />
        </Grid.Root>
      </UsersPermissionsProvider>
    );
  }
);

export default memo(UsersPermissions);
