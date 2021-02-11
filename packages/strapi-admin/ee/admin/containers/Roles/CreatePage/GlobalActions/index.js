import React, { memo, useMemo } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { usePermissionsDataManager } from '../contexts/PermissionsDataManagerContext';
import CheckboxWithCondition from '../CheckboxWithCondition';
import { findDisplayedActions, getCheckboxesState } from './utils';
import Wrapper from './Wrapper';

const GlobalActions = ({ actions, kind }) => {
  const { formatMessage } = useIntl();
  const { modifiedData } = usePermissionsDataManager();

  const displayedActions = useMemo(() => {
    return findDisplayedActions(actions);
  }, [actions]);

  const checkboxesState = useMemo(() => {
    return getCheckboxesState(displayedActions, modifiedData[kind]);
  }, [modifiedData, displayedActions, kind]);

  return (
    <Wrapper>
      <Flex>
        {displayedActions.map(({ label, actionId }) => {
          return (
            <CheckboxWithCondition
              key={actionId}
              message={formatMessage({
                id: `Settings.roles.form.permissions.${label.toLowerCase()}`,
                defaultMessage: label,
              })}
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
  kind: PropTypes.string.isRequired,
};

export default memo(GlobalActions);
