import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';

import { usePermissionsContext } from '../../../../../../../../admin/src/hooks';
import { getAttributesToDisplay } from '../../../../../../../../admin/src/utils';
import {
  CONTENT_MANAGER_PREFIX,
  STATIC_ATTRIBUTE_ACTIONS,
  getAttributesByModel,
  getNumberOfRecursivePermissionsByAction,
  isCreateAndRequired,
} from '../../../../../../../../admin/src/components/Roles/Permissions/utils';
import CollapseLabel from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import PermissionCheckbox from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import Chevron from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import Required from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Required';
import Curve from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/Curve';
import ComponentsAttributes from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes';
import RowStyle from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes/RowStyle';
import useFillRequiredPermissions from '../../useFillRequiredPermissions';

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

const ComponentAttributeRow = ({
  contentType,
  attribute,
  index,
  numberOfAttributes,
  recursiveLevel,
}) => {
  const {
    components,
    dispatch,
    contentTypesPermissions,
    collapsePath,
    isSuperAdmin,
  } = usePermissionsContext();
  const component = useMemo(
    () => components.find(component => component.uid === attribute.component),
    [attribute, components]
  );
  const isCollapsable = attribute.type === 'component';
  const contentTypeUid = collapsePath[0];
  const isActive = collapsePath[recursiveLevel + 2] === attribute.attributeName;
  const fillRequiredPermissions = useFillRequiredPermissions(contentType);

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
    return isCollapsable
      ? getAttributesByModel(component, components, attributePermissionName)
      : [attribute];
  }, [isCollapsable, component, components, attributePermissionName, attribute]);

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
    ({ target: { name, value } }, action) => {
      const shouldSetRequiredFields = action === `${CONTENT_MANAGER_PREFIX}.create`;

      if (shouldSetRequiredFields) {
        fillRequiredPermissions();
      }

      if (isCollapsable) {
        dispatch({
          type: 'SELECT_MULTIPLE_ATTRIBUTE',
          subject: name,
          shouldEnable: value,
          attributes: recursiveAttributes,
          action,
        });
      } else {
        dispatch({
          type: 'SELECT_ACTION',
          subject: name,
          attribute: attributePermissionName,
          action,
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
      dispatch({
        type: 'COLLAPSE_PATH',
        index: recursiveLevel + 2,
        value: attribute.attributeName,
      });
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
            {STATIC_ATTRIBUTE_ACTIONS.map(action => (
              <PermissionCheckbox
                disabled={
                  isSuperAdmin || (isCreateAndRequired(attribute, action) && !isCollapsable)
                }
                key={`${attribute.attributeName}-${action}`}
                onChange={e => handleCheck(e, action)}
                someChecked={someChecked(action)}
                value={isCreateAndRequired(attribute, action) || isChecked(action)}
                name={contentTypeUid}
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
            contentType={contentType}
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
  contentType: PropTypes.object.isRequired,
};
export default ComponentAttributeRow;
