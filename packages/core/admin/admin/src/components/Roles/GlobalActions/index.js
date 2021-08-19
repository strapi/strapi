import { Checkbox, Stack, TableLabel } from '@strapi/parts';
import IS_DISABLED from 'ee_else_ce/components/Roles/GlobalActions/utils/constants';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import React, { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { usePermissionsDataManager } from '../../../hooks';
import { cellWidth, firstRowWidth } from '../Permissions/utils/constants';
import { findDisplayedActions, getCheckboxesState } from './utils';

const CenteredStack = styled(Stack)`
  align-items: center;
  justify-content: center;
  width: ${cellWidth};
`;

const Wrapper = styled.div`
  padding-left: ${firstRowWidth};
  padding-bottom: ${({ theme }) => theme.spaces[4]};
  padding-top: ${({ theme }) => theme.spaces[6]};
  ${({ disabled, theme }) =>
    `
    input[type='checkbox'] {
      &:after {
        color: ${!disabled ? theme.main.colors.mediumBlue : theme.main.colors.grey};
      }
    }
    cursor: initial;
    `}
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
      <Stack horizontal>
        {displayedActions.map(({ label, actionId }) => {
          return (
            <CenteredStack key={actionId} size={3}>
              <TableLabel textColor="neutral500">
                {formatMessage({
                  id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                  defaultMessage: label,
                })}
              </TableLabel>
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
