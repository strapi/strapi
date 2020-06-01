import React from 'react';
import { Flex } from '@buffetjs/core';

import PermissionCheckbox from '../PermissionCheckbox';
import Wrapper from './Wrapper';

const PermissionsHeader = () => {
  return (
    <Wrapper>
      <Flex>
        <PermissionCheckbox message="Create" />
        <PermissionCheckbox message="Read" />
        <PermissionCheckbox message="Update" />
        <PermissionCheckbox message="Delete" />
        <PermissionCheckbox message="Publish" />
      </Flex>
    </Wrapper>
  );
};

export default PermissionsHeader;
