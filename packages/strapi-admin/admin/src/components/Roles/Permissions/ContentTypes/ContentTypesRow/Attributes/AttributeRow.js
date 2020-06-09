import React from 'react';
import PropTypes from 'prop-types';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import PermissionCheckbox from '../../PermissionCheckbox';
import PermissionName from '../PermissionName';
import CollapseLabel from '../../CollapseLabel';
import Chevron from '../Chevron';
import PermissionWrapper from '../PermissionWrapper';
import AttributeRowWrapper from './AttributeRowWrapper';

const AttributeRow = ({ attribute }) => {
  const isCollapsable = attribute.type === 'component';

  const handleToggleAttributes = () => {
    console.log('openAttribute');
  };

  return (
    <AttributeRowWrapper isCollapsable={isCollapsable} alignItems="center">
      <Flex style={{ flex: 1 }}>
        <Padded left size="sm" />
        <PermissionName width="15rem">
          <Checkbox name={attribute.attributeName} someChecked />
          <CollapseLabel
            title={attribute.attributeName}
            alignItems="center"
            onClick={handleToggleAttributes}
          >
            <Text
              color="grey"
              ellipsis
              fontSize="xs"
              fontWeight="bold"
              lineHeight="20px"
              textTransform="uppercase"
            >
              {attribute.attributeName}
            </Text>
            <Chevron icon="chevron-down" />
          </CollapseLabel>
        </PermissionName>
        <PermissionWrapper>
          <PermissionCheckbox name={`${attribute.attributeName}-create`} />
          <PermissionCheckbox name={`${attribute.attributeName}-read`} />
          <PermissionCheckbox name={`${attribute.attributeName}-update`} />
        </PermissionWrapper>
      </Flex>
    </AttributeRowWrapper>
  );
};

AttributeRow.propTypes = {
  attribute: PropTypes.object.isRequired,
};

export default AttributeRow;
