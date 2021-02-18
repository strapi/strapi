import React from 'react';
import PropTypes from 'prop-types';
import { Text, Padded, Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import ConditionsSelect from '../ConditionsSelect';
import ActionRowWrapper from './ActionRowWrapper';

const ActionRow = ({ value, onChange, isGrey, action }) => {
  const { formatMessage } = useIntl();

  return (
    <ActionRowWrapper isGrey={isGrey}>
      <Padded style={{ width: 200 }} top left right bottom size="sm">
        <Flex>
          <Text
            lineHeight="19px"
            color="grey"
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
          >
            {formatMessage({
              id: 'Settings.permissions.conditions.can',
            })}
            &nbsp;
          </Text>
          <Text
            title={action.displayName}
            lineHeight="19px"
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
            color="mediumBlue"
            style={{ maxWidth: '60%' }}
            ellipsis
          >
            {action.displayName}
          </Text>
          <Text
            lineHeight="19px"
            color="grey"
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
          >
            &nbsp;
            {formatMessage({
              id: 'Settings.permissions.conditions.when',
            })}
          </Text>
        </Flex>
      </Padded>
      <ConditionsSelect onChange={onChange} value={value} />
    </ActionRowWrapper>
  );
};

ActionRow.defaultProps = {
  value: [],
};
ActionRow.propTypes = {
  action: PropTypes.object.isRequired,
  isGrey: PropTypes.bool.isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
};
export default ActionRow;
