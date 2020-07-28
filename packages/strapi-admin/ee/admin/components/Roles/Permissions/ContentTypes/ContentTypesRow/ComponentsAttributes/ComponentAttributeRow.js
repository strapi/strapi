import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';

import { usePermissionsContext } from '../../../../../../../../admin/src/hooks';
import { getAttributesToDisplay } from '../../../../../../../../admin/src/utils';
import {
  contentManagerPermissionPrefix,
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  getAttributesByModel,
  getAttributePermissionsSizeByContentTypeAction,
  getNumberOfRecursivePermissionsByAction,
} from '../../../../../../../../admin/src/components/Roles/Permissions/utils';
import CollapseLabel from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import PermissionCheckbox from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import Chevron from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import Required from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Required';
import Curve from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/Curve';
import ComponentsAttributes from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes';
import RowStyle from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/RowStyle';

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
    contentTypesPermissions,
    collapsePath,
    onAttributePermissionSelect,
    onAttributesSelect,
    isSuperAdmin,
  } = usePermissionsContext();
  const isCollapsable = attribute.type === 'component';
  const contentTypeUid = collapsePath[0];
  const isActive = collapsePath[recursiveLevel + 2] === attribute.attributeName;

  const attributePermissionName = useMemo(
    () => [...collapsePath.slice(1), attribute.attributeName].join('.'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute]
  );

  const attributeActions = useMemo(() => {
    return get(
      contentTypesPermissions,
      [contentTypeUid, 'attributes', attributePermissionName, 'actions'],
      []
    );
  }, [attributePermissionName, contentTypeUid, contentTypesPermissions]);

  const recursiveAttributes = useMemo(() => {
    const component = components.find(component => component.uid === attribute.component);

    return isCollapsable
      ? getAttributesByModel(component, components, attributePermissionName)
      : [attribute];
  }, [components, attribute, attributePermissionName, isCollapsable]);

  const getContentTypePermissions = useCallback(
    action => {
      return getAttributePermissionsSizeByContentTypeAction(
        contentTypesPermissions,
        contentTypeUid,
        action
      );
    },
    [contentTypeUid, contentTypesPermissions]
  );

  const getRecursiveAttributesPermissions = useCallback(
    action => {
      const number = getNumberOfRecursivePermissionsByAction(
        contentTypeUid,
        action,
        isCollapsable ? `${attributePermissionName}.` : attributePermissionName,
        contentTypesPermissions
      );

      return number;
    },
    [attributePermissionName, contentTypeUid, isCollapsable, contentTypesPermissions]
  );

  const handleCheck = useCallback(
    action => {
      // If the current attribute is a component,
      // we need select all the component attributes.
      // Otherwhise, we just need to select the current attribute

      if (isCollapsable) {
        const shouldEnable = !allRecursiveChecked(action);
        const hasContentTypeAction =
          (!shouldEnable &&
            getContentTypePermissions(action) === getRecursiveAttributesPermissions(action)) ||
          (shouldEnable && getContentTypePermissions(action) === 0);

        onAttributesSelect({
          action,
          subject: contentTypeUid,
          attributes: recursiveAttributes,
          shouldEnable: !allRecursiveChecked(action),
          hasContentTypeAction,
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
    [attribute, contentTypesPermissions]
  );

  const checkPermission = useCallback(
    action => {
      return attributeActions.findIndex(permAction => permAction === action) !== -1;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, attribute]
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
      isCollapsable && recursivePermissions > 0 && recursivePermissions < recursiveAttributes.length
    );
  };

  const allRecursiveChecked = action => {
    const recursivePermissions = getRecursiveAttributesPermissions(action);

    return isCollapsable && recursivePermissions === recursiveAttributes.length;
  };

  const isChecked = action => {
    return allRecursiveChecked(action) || checkPermission(action);
  };

  return (
    <LeftBorderTimeline isVisible={index + 1 < numberOfAttributes}>
      <AttributeRowWrapper isSmall={attribute.component || index + 1 === numberOfAttributes}>
        <Curve fill="#a5d5ff" />
        <Flex style={{ flex: 1 }}>
          <RowStyle
            isActive={isActive}
            isRequired={attribute.required && !isCollapsable}
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
          <PermissionWrapper disabled={isSuperAdmin || (attribute.required && !isCollapsable)}>
            {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
              <PermissionCheckbox
                disabled={isSuperAdmin || (attribute.required && !isCollapsable)}
                key={`${attribute.attributeName}-${action}`}
                onChange={() => handleCheck(`${contentManagerPermissionPrefix}.${action}`)}
                someChecked={someChecked(`${contentManagerPermissionPrefix}.${action}`)}
                value={isChecked(`${contentManagerPermissionPrefix}.${action}`)}
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
