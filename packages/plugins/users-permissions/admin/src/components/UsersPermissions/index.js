import React, { memo, useReducer, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Grid, GridItem } from '@strapi/design-system/Grid';
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

  const handleChange = ({ target: { name, value } }) =>
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value: value === 'empty__string_value' ? '' : value,
    });

  const handleChangeSelectAll = ({ target: { name, value } }) =>
    dispatch({
      type: 'ON_CHANGE_SELECT_ALL',
      keys: name.split('.'),
      value,
    });

  const handleSelectedAction = actionToSelect =>
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
      <Grid gap={0} shadow="filterShadow" hasRadius background="neutral0">
        <GridItem col={7} paddingTop={6} paddingBottom={6} paddingLeft={7} paddingRight={7}>
          <Stack spacing={6}>
            <Stack spacing={2}>
              <Typography variant="delta" as="h2">
                {formatMessage({
                  id: getTrad('Plugins.header.title'),
                  defaultMessage: 'Permissions',
                })}
              </Typography>
              <Typography as="p" textColor="neutral600">
                {formatMessage({
                  id: getTrad('Plugins.header.description'),
                  defaultMessage: 'Only actions bound by a route are listed below.',
                })}
              </Typography>
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
