import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import CheckboxWithCondition from '../CheckboxWithCondition';
import Wrapper from './Wrapper';

const GlobalActions = ({ actions }) => {
  const { formatMessage } = useIntl();

  const displayedActions = useMemo(() => {
    return actions.filter(({ subjects }) => {
      return subjects.length;
    });
  }, [actions]);

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
              value={false}
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
};

export default memo(GlobalActions);
