import { Box, Checkbox, Stack } from '@strapi/parts';
import IS_DISABLED from 'ee_else_ce/components/Roles/GlobalActions/utils/constants';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import React, { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { usePermissionsDataManager } from '../../../hooks';
import { findDisplayedActions, getCheckboxesState } from './utils';
import Wrapper from './Wrapper';

const Label = styled(Box)`
  font-size: ${11 / 16}rem;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.neutral500};
  font-weight: bold;
`;

// ! TODO - Remove dflex, and fcolumn when strapi/parts is updated
const CenteredStack = styled(Stack)`
  align-items: center;
  justify-content: center;
  display: flex;
  flex-direction: column;
  width: 120px;
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
    <Wrapper disabled={isFormDisabled}>
      <Stack horizontal size={4}>
        {displayedActions.map(({ label, actionId }) => {
          return (
            <CenteredStack key={actionId} size={3}>
              <Label>
                {formatMessage({
                  id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                  defaultMessage: label,
                })}
              </Label>
              <Checkbox
                disabled={isFormDisabled || IS_DISABLED}
                onValueChange={value => {
                  onChangeCollectionTypeGlobalActionCheckbox(kind, actionId, value);
                }}
                name={actionId}
                value={get(checkboxesState, [actionId, 'hasAllActionsSelected'], false)}
                indeterminate={get(checkboxesState, [actionId, 'hasSomeActionsSelected'], false)}
              />
            </CenteredStack>
          );
        })}
      </Stack>
    </Wrapper>
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
