import React, { memo, useMemo } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import IS_DISABLED from 'ee_else_ce/components/Roles/GlobalActions/utils/constants';
import { usePermissionsDataManager } from '../../../hooks';
import CheckboxWithCondition from '../CheckboxWithCondition';
import { findDisplayedActions, getCheckboxesState } from './utils';
import Wrapper from './Wrapper';

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
      <Flex>
        {displayedActions.map(({ label, actionId }) => {
          return (
            <CheckboxWithCondition
              key={actionId}
              disabled={isFormDisabled || IS_DISABLED}
              message={formatMessage({
                id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                defaultMessage: label,
              })}
              onChange={({ target: { value } }) => {
                onChangeCollectionTypeGlobalActionCheckbox(kind, actionId, value);
              }}
              name={actionId}
              value={get(checkboxesState, [actionId, 'hasAllActionsSelected'], false)}
              someChecked={get(checkboxesState, [actionId, 'hasSomeActionsSelected'], false)}
            />
          );
        })}
      </Flex>
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
