import React from 'react';
import styled from 'styled-components';
import { Icon, Flex } from '@strapi/design-system';
import { Paint } from '@strapi/icons';

const IconBox = styled(Flex)`
  /* Hard code color values */
  /* to stay consistent between themes */
  background-color: #f0f0ff; /* primary100 */
  border: 1px solid #d9d8ff; /* primary200 */

  svg > path {
    fill: #4945ff; /* primary600 */
  }
`;

const ColorPickerIcon = () => {
  return (
    <IconBox justifyContent="center" alignItems="center" width={7} height={6} hasRadius aria-hidden>
      <Icon as={Paint} />
    </IconBox>
  );
};

export default ColorPickerIcon;
