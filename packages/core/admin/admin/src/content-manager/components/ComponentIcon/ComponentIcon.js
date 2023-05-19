import PropTypes from 'prop-types';
import React from 'react';

import { Flex, Icon } from '@strapi/design-system';
import { Cube } from '@strapi/icons';
import { COMPONENT_ICONS } from './constants';

export function ComponentIcon({ showBackground = true, size = 'M', icon }) {
  return (
    <Flex
      alignItems="center"
      background={showBackground ? 'neutral200' : null}
      justifyContent="center"
      size={size}
      showBackground={showBackground}
      height={size === 'S' ? 5 : 8}
      width={size === 'S' ? 5 : 8}
      color="neutral600"
      borderRadius={showBackground ? '50%' : 0}
    >
      <Icon
        as={COMPONENT_ICONS[icon] || Cube}
        height={size === 'S' ? 3 : 5}
        width={size === 'S' ? 3 : 5}
      />
    </Flex>
  );
}

ComponentIcon.defaultProps = {
  showBackground: true,
  size: 'M',
  icon: null,
};

ComponentIcon.propTypes = {
  showBackground: PropTypes.bool,
  size: PropTypes.string,
  icon: PropTypes.string,
};
