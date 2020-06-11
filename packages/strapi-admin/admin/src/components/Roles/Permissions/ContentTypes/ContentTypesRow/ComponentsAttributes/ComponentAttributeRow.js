import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';

import { usePermissionsContext } from '../../../../../../hooks';
import { getAttributesToDisplay } from '../../../../../../utils';
import CollapseLabel from '../../CollapseLabel';
import PermissionCheckbox from '../../PermissionCheckbox';
import PermissionWrapper from '../PermissionWrapper';
import Chevron from '../Chevron';
import Curve from './Curve';
// eslint-disable-next-line import/no-cycle
import ComponentsAttributes from './index';
import RowStyle from './RowStyle';

// Those styles will be used only in this file.
const LeftBorderTimeline = styled.div`
  border-left: ${({ isVisible }) => (isVisible ? '3px solid #a5d5ff' : '3px solid transparent')};
`;
const SubLevelWrapper = styled.div`
  padding-bottom: 8px;
`;
const AttributeRowWrapper = styled(Flex)`
  height: ${({ isSmall }) => (isSmall ? '28px' : '36px')};
`;

const ComponentAttributeRow = ({ attribute, index, numberOfAttributes, recursiveLevel }) => {
  const { components, onCollapse, collapsePath } = usePermissionsContext();
  const isActive = collapsePath[recursiveLevel + 2] === attribute.attributeName;

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(components.find(comp => comp.uid === attribute.component));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute]);

  const handleToggleAttributes = () => {
    if (attribute.component) {
      onCollapse(recursiveLevel + 2, attribute.attributeName);
    }
  };

  return (
    <LeftBorderTimeline isVisible={index + 1 < numberOfAttributes}>
      <AttributeRowWrapper isSmall={attribute.component || index + 1 === numberOfAttributes}>
        <Curve fill="#a5d5ff" />
        <Flex style={{ flex: 1 }}>
          <RowStyle
            isActive={isActive}
            isRequired={attribute.required}
            isCollapsable={attribute.component}
            level={recursiveLevel}
          >
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
          </RowStyle>
          <PermissionWrapper>
            <PermissionCheckbox name={`${attribute.attributeName}-create`} />
            <PermissionCheckbox name={`${attribute.attributeName}-read`} />
            <PermissionCheckbox hasConditions name={`${attribute.attributeName}-update`} />
          </PermissionWrapper>
        </Flex>
      </AttributeRowWrapper>
      {isActive && attribute.component && (
        <SubLevelWrapper>
          <ComponentsAttributes
            recursiveLevel={recursiveLevel + 1}
            attributes={attributesToDisplay}
          />
        </SubLevelWrapper>
      )}
    </LeftBorderTimeline>
  );
};

ComponentAttributeRow.propTypes = {
  attribute: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  numberOfAttributes: PropTypes.number.isRequired,
  recursiveLevel: PropTypes.number.isRequired,
};
export default ComponentAttributeRow;
