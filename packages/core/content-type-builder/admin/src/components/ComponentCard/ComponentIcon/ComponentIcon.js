import PropTypes from 'prop-types';
import React from 'react';

import { Flex, Icon } from '@strapi/design-system';
import { Cube } from '@strapi/icons';
import { COMPONENT_ICONS } from '../../IconPicker/constants';

export function ComponentIcon({ isActive, icon }) {
  return (
    <Flex
      alignItems="center"
      background={isActive ? 'primary200' : 'neutral200'}
      justifyContent="center"
      height={8}
      width={8}
      borderRadius="50%"
    >
      <Icon as={COMPONENT_ICONS[icon] || Cube} height={5} width={5} />
    </Flex>
  );
}

ComponentIcon.defaultProps = {
  isActive: false,
  icon: null,
};

ComponentIcon.propTypes = {
  isActive: PropTypes.bool,
  icon: PropTypes.string,
};
