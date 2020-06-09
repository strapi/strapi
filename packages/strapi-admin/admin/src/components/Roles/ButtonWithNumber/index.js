import React from 'react';
import PropTypes from 'prop-types';
import { Button, Flex, Text, Padded } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import NumberCard from './NumberCard';

const ButtonWithNumber = ({ number, onClick }) => (
  <Button color="primary" onClick={onClick}>
    <Flex justifyContent="space-between" alignItems="center">
      <FontAwesomeIcon icon="users" />
      <Padded left size="xs" />
      <Text color="white" fontWeight="semiBold">
        Users with this role
      </Text>
      <Padded left size="xs" />
      <NumberCard>
        <Text fontSize="xs" fontWeight="bold" color="mediumBlue">
          {number}
        </Text>
      </NumberCard>
    </Flex>
  </Button>
);

ButtonWithNumber.defaultProps = {
  number: 0,
};
ButtonWithNumber.propTypes = {
  number: PropTypes.number,
  onClick: PropTypes.func.isRequired,
};

export default ButtonWithNumber;
