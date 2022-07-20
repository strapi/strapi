import React from 'react';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import Puzzle from '@strapi/icons/Puzzle';

const ColorPickerIcon = () => {
  return (
    <Flex
      justifyContent="center"
      width={7}
      height={6}
      background="primary100"
      borderColor="primary200"
      hasRadius
    >
      <Icon as={Puzzle} width={3} color="primary600" />
    </Flex>
  );
};

export default ColorPickerIcon;
