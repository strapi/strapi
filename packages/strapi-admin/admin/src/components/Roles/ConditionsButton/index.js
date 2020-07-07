import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Flex, Text, Padded } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Wrapper from './Wrapper';

const ConditionsButton = ({ onClick, className, hasConditions, isRight }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper
      isRight={isRight}
      hasConditions={hasConditions}
      className={className}
      onClick={onClick}
    >
      <Padded right size="smd">
        <Flex alignItems="center">
          <Text color="mediumBlue">
            {formatMessage({ id: 'app.components.LeftMenuLinkContainer.settings' })}
          </Text>
          <Padded style={{ height: '18px', lineHeight: 'normal' }} left size="xs">
            <FontAwesomeIcon style={{ fontSize: '11px' }} icon="cog" />
          </Padded>
        </Flex>
      </Padded>
    </Wrapper>
  );
};

ConditionsButton.defaultProps = {
  className: null,
  hasConditions: false,
  isRight: false,
};
ConditionsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  hasConditions: PropTypes.bool,
  isRight: PropTypes.bool,
};

// This is a styled component advanced usage :
// Used to make a ref to a non styled component.
// https://styled-components.com/docs/advanced#caveat
export default styled(ConditionsButton)``;
