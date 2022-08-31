import React from 'react';
import { Icon } from '@strapi/design-system/Icon';
import { Flex } from '@strapi/design-system/Flex';
import Paint from '@strapi/icons/Paint';

const ColorPickerIcon = () => {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      background="primary100"
      borderColor="primary200"
      width={7}
      height={6}
      hasRadius
      aria-hidden
    >
      <Icon as={Paint} color="primary600" />
    </Flex>
  );
};

export default ColorPickerIcon;
