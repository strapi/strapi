import React, { memo, useReducer, useCallback, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { H3, Text } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { useIntl } from 'react-intl';
import getTrad from '../../utils/getTrad';
import Policies from '../Policies';
import Permissions from '../Permissions';
import reducer, { initialState } from './reducer';
import { UsersPermissionsProvider } from '../../contexts/UsersPermissionsContext';
import init from './init';

const UsersPermissions = forwardRef(({ permissions, routes }, ref) => {
  const { formatMessage } = useIntl();
  const [state, dispatch] = useReducer(reducer, initialState, state =>
    init(state, permissions, routes)
  );

  useImperativeHandle(ref, () => ({
    getPermissions: () => {
      return {
        permissions: state.modifiedData,
      };
    },
    resetForm: () => {
      dispatch({ type: 'ON_RESET' });
    },
    setFormAfterSubmit: () => {
      dispatch({ type: 'ON_SUBMIT_SUCCEEDED' });
    },
  }));

  const handleChange = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value: value === 'empty__string_value' ? '' : value,
    });
  }, []);

  const handleChangeSelectAll = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE_SELECT_ALL',
      keys: name.split('.'),
      value,
    });
  }, []);

  const handleSelectedAction = useCallback(actionToSelect => {
    dispatch({
      type: 'SELECT_ACTION',
      actionToSelect,
    });
  }, []);

  const providerValue = {
    ...state,
    onChange: handleChange,
    onChangeSelectAll: handleChangeSelectAll,
    onSelectedAction: handleSelectedAction,
  };

  return (
    <UsersPermissionsProvider value={providerValue}>
      <Grid gap={0} shadow="filterShadow" hasRadius background="neutral0">
        <GridItem col={7} paddingTop={6} paddingBottom={6} paddingLeft={7} paddingRight={7}>
          <Stack size={4}>
            <Stack size={2}>
              <H3 as="h2">
                {formatMessage({
                  id: getTrad('Plugins.header.title'),
                  defaultMessage: 'Permissions',
                })}
              </H3>
              <Text as="p" textColor="neutral600">
                {formatMessage({
                  id: getTrad('Plugins.header.description'),
                  defaultMessage: 'Only actions bound by a route are listed below.',
                })}
              </Text>
            </Stack>
            <Permissions />
          </Stack>
        </GridItem>
        <Policies />
      </Grid>
    </UsersPermissionsProvider>
  );
});

UsersPermissions.propTypes = {
  permissions: PropTypes.object.isRequired,
  routes: PropTypes.object.isRequired,
};

export default memo(UsersPermissions);
