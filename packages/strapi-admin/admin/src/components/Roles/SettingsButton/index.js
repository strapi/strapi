import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Text, Padded } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Wrapper from './Wrapper';

const SettingsButton = ({ onClick, className }) => {
  return (
    <Wrapper className={className} onClick={onClick}>
      <Padded right size="smd">
        <Flex alignItems="center">
          <Text>Settings</Text>
          <Padded style={{ height: '18px' }} left size="xs">
            <FontAwesomeIcon icon="cog" />
          </Padded>
        </Flex>
      </Padded>
    </Wrapper>
  );
};

SettingsButton.defaultProps = {
  className: null,
};
SettingsButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
};

// This is a styled component advanced usage :
// Used to make a ref to a non styled component.
// https://styled-components.com/docs/advanced#caveat
export default styled(SettingsButton)``;
