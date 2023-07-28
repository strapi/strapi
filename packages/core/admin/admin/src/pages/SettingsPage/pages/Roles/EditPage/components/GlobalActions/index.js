import React, { memo, useMemo } from 'react';

import { BaseCheckbox, Box, Flex, Typography } from '@strapi/design-system';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { usePermissionsDataManager } from '../../../../../../../hooks';
import { cellWidth, firstRowWidth } from '../Permissions/utils/constants';

import { findDisplayedActions, getCheckboxesState } from './utils';

const CenteredStack = styled(Flex)`
  width: ${cellWidth};
  flex-shrink: 0;
`;

const GlobalActions = ({ actions, isFormDisabled, kind }) => {
  const { formatMessage } = useIntl();
  const { modifiedData, onChangeCollectionTypeGlobalActionCheckbox } = usePermissionsDataManager();

  const displayedActions = useMemo(() => {
    return findDisplayedActions(actions);
  }, [actions]);

  const checkboxesState = useMemo(() => {
    return getCheckboxesState(displayedActions, modifiedData[kind]);
  }, [modifiedData, displayedActions, kind]);

  return (
    <Box paddingBottom={4} paddingTop={6} style={{ paddingLeft: firstRowWidth }}>
      <Flex gap={0}>
        {displayedActions.map(({ label, actionId }) => {
          return (
            <CenteredStack
              direction="column"
              alignItems="center"
              justifyContent="center"
              key={actionId}
              gap={3}
            >
              <Typography variant="sigma" textColor="neutral500">
                {formatMessage({
                  id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                  defaultMessage: label,
                })}
              </Typography>
              <BaseCheckbox
                disabled={isFormDisabled}
                onValueChange={(value) => {
                  onChangeCollectionTypeGlobalActionCheckbox(kind, actionId, value);
                }}
                name={actionId}
                aria-label={formatMessage(
                  {
                    id: `Settings.permissions.select-all-by-permission`,
                    defaultMessage: 'Select all {label} permissions',
                  },
                  {
                    label: formatMessage({
                      id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                      defaultMessage: label,
                    }),
                  }
                )}
                value={get(checkboxesState, [actionId, 'hasAllActionsSelected'], false)}
                indeterminate={get(checkboxesState, [actionId, 'hasSomeActionsSelected'], false)}
              />
            </CenteredStack>
          );
        })}
      </Flex>
    </Box>
  );
};

GlobalActions.defaultProps = {
  actions: [],
};

GlobalActions.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      actionId: PropTypes.string.isRequired,
      subjects: PropTypes.array.isRequired,
    })
  ),
  isFormDisabled: PropTypes.bool.isRequired,
  kind: PropTypes.string.isRequired,
};

export default memo(GlobalActions);
