import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';

import { usePermissionsContext } from '../../../../../../../src/hooks';
import { getAttributesToDisplay } from '../../../../../../../src/utils';
import {
  contentManagerPermissionPrefix,
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  getAttributesByModel,
  getNumberOfRecursivePermissionsByAction,
} from '../../../../../../../src/components/Roles/Permissions/utils';
import CollapseLabel from '../../../../../../../src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import PermissionCheckbox from '../../../../../../../src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionWrapper from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import Chevron from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import Required from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Required';
import Curve from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/Curve';
import ComponentsAttributes from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes';
import RowStyle from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/RowStyle';

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
  const {
    components,
    onCollapse,
    permissions,
    collapsePath,
    onAttributePermissionSelect,
    onAttributesSelect,
  } = usePermissionsContext();
  const isCollapsable = attribute.type === 'component';
  const contentTypeUid = collapsePath[0];
  const isActive = collapsePath[recursiveLevel + 2] === attribute.attributeName;

  const attributePermissionName = useMemo(
    () => [...collapsePath.slice(1), attribute.attributeName].join('.'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute]
  );

  const attributeActions = get(
    permissions,
    [contentTypeUid, attributePermissionName, 'actions'],
    []
  );

  const getRecursiveAttributes = useCallback(() => {
    const component = components.find(component => component.uid === attribute.component);

    return [
      ...getAttributesByModel(component, components, attributePermissionName),
      { ...attribute, attributeName: attributePermissionName },
    ];
  }, [attribute, attributePermissionName, components]);

  const getRecursiveAttributesPermissions = action => {
    const number = getNumberOfRecursivePermissionsByAction(
      contentTypeUid,
      action,
      isCollapsable
        ? attributePermissionName
        : attributePermissionName.substr(0, attributePermissionName.lastIndexOf('.')),
      permissions
    );

    return number;
  };

  const handleCheck = useCallback(
    action => {
      // If the current attribute is a component,
      // we need select all the component attributes.
      // Otherwhise, we just need to select the current attribute
      if (isCollapsable) {
        onAttributesSelect({
          action,
          subject: contentTypeUid,
          attributes: getRecursiveAttributes(),
          shouldEnable: !allRecursiveChecked(action),
        });
      } else {
        onAttributePermissionSelect({
          subject: contentTypeUid,
          action,
          attribute: attributePermissionName,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute, permissions]
  );

  const checkPermission = useCallback(
    action => {
      return (
        attributeActions.findIndex(
          permAction => permAction === `${contentManagerPermissionPrefix}.${action}`
        ) !== -1
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, attribute]
  );

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(components.find(comp => comp.uid === attribute.component));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute]);

  const handleToggleAttributes = () => {
    if (isCollapsable) {
      onCollapse(recursiveLevel + 2, attribute.attributeName);
    }
  };

  const someChecked = action => {
    const recursivePermissions = getRecursiveAttributesPermissions(action);

    return (
      isCollapsable &&
      recursivePermissions > 0 &&
      recursivePermissions < getRecursiveAttributes().length
    );
  };

  const allRecursiveChecked = action => {
    const recursivePermissions = getRecursiveAttributesPermissions(action);

    return isCollapsable && recursivePermissions === getRecursiveAttributes().length;
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
              {attribute.required && <Required>*</Required>}
              <Chevron icon={isActive ? 'caret-up' : 'caret-down'} />
            </CollapseLabel>
          </RowStyle>
          <PermissionWrapper>
            {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
              <PermissionCheckbox
                key={`${attribute.attributeName}-${action}`}
                disabled={attribute.required}
                onChange={() => handleCheck(`${contentManagerPermissionPrefix}.${action}`)}
                someChecked={someChecked(`${contentManagerPermissionPrefix}.${action}`)}
                value={allRecursiveChecked(action) || checkPermission(action)}
                name={`${attribute.attributeName}-${action}`}
              />
            ))}
          </PermissionWrapper>
        </Flex>
      </AttributeRowWrapper>
      {isActive && isCollapsable && (
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
