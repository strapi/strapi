import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button, Flex, Text, Padded } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import NumberCard from './NumberCard';

const ButtonWithNumber = ({ number, onClick }) => {
  const { formatMessage } = useIntl();

  return (
    <Button disabled color="primary" onClick={onClick}>
      <Flex style={{ minWidth: '17rem' }} justifyContent="space-between" alignItems="center">
        <FontAwesomeIcon icon="users" />
        <Padded left size="sm" />
        <Text color="grey" fontWeight="semiBold">
          {formatMessage({
            id: 'Settings.roles.form.button.users-with-role',
            defaultMessage: 'Users with this role',
          })}
        </Text>
        <Padded left size="sm" />
        <NumberCard>
          <Text fontSize="xs" fontWeight="bold" color="grey">
            {number}
          </Text>
        </NumberCard>
      </Flex>
    </Button>
  );
};

ButtonWithNumber.defaultProps = {
  number: 0,
};
ButtonWithNumber.propTypes = {
  number: PropTypes.number,
  onClick: PropTypes.func.isRequired,
};

export default ButtonWithNumber;
