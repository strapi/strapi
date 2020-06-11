import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../hooks';
import { getAttributesToDisplay } from '../../../../../../utils';
import PermissionCheckbox from '../../PermissionCheckbox';
import PermissionName from '../PermissionName';
import CollapseLabel from '../../CollapseLabel';
import ComponentsAttributes from '../ComponentsAttributes';
import Chevron from '../Chevron';
import PermissionWrapper from '../PermissionWrapper';
import AttributeRowWrapper from './AttributeRowWrapper';

const AttributeRow = ({ attribute }) => {
  const { onCollapse, collapsePath, components } = usePermissionsContext();
  const isCollapsable = attribute.type === 'component';
  const isActive = collapsePath[1] === attribute.attributeName;

  const handleToggleAttributes = () => {
    if (attribute.component) {
      onCollapse(1, attribute.attributeName);
    }
  };

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(components.find(comp => comp.uid === attribute.component));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute]);

  return (
    <>
      <AttributeRowWrapper
        isRequired={attribute.required}
        isActive={isActive}
        isCollapsable={isCollapsable}
        alignItems="center"
      >
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName width="15rem">
            <Checkbox name={attribute.attributeName} someChecked />
            <CollapseLabel
              title={attribute.attributeName}
              alignItems="center"
              isCollapsable={attribute.component}
              onClick={handleToggleAttributes}
            >
              <Text
                color={isActive ? 'mediumBlue' : 'grey'}
                ellipsis
                fontSize="xs"
                fontWeight="bold"
                lineHeight="20px"
                textTransform="uppercase"
              >
                {attribute.attributeName}
              </Text>
              <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
            </CollapseLabel>
          </PermissionName>
          <PermissionWrapper>
            <PermissionCheckbox name={`${attribute.attributeName}-create`} />
            <PermissionCheckbox hasConditions name={`${attribute.attributeName}-read`} />
            <PermissionCheckbox name={`${attribute.attributeName}-update`} />
          </PermissionWrapper>
        </Flex>
      </AttributeRowWrapper>
      {isActive && <ComponentsAttributes attributes={attributesToDisplay} />}
    </>
  );
};

AttributeRow.propTypes = {
  attribute: PropTypes.object.isRequired,
};

export default AttributeRow;
