import React from 'react';
import { Flex, Padded, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { upperFirst } from 'lodash';
import PropTypes from 'prop-types';

const PrefixedIcon = ({ icon, name }) => {
  return (
    <Flex>
      <div>
        <FontAwesomeIcon icon={icon} />
      </div>
      <Padded left size="md">
        <Text fontWeight="semiBold" lineHeight="18px">
          {upperFirst(name)}
        </Text>
      </Padded>
    </Flex>
  );
};

PrefixedIcon.propTypes = {
  icon: PropTypes.array.isRequired,
  name: PropTypes.string.isRequired,
};

export default PrefixedIcon;
