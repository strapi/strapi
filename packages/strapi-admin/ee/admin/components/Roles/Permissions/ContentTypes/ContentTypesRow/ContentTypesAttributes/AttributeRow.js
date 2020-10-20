import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../../../admin/src/hooks';
import { getAttributesToDisplay } from '../../../../../../../../admin/src/utils';
import {
  contentManagerPermissionPrefix,
  getNumberOfRecursivePermissionsByAction,
  getAttributesByModel,
  getRecursivePermissions,
  staticAttributeActions,
  isCreateAndRequired,
} from '../../../../../../../../admin/src/components/Roles/Permissions/utils';
import PermissionCheckbox from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionName from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionName';
import CollapseLabel from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import ComponentsAttributes from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes';
import Chevron from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import PermissionWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import AttributeRowWrapper from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ContentTypesAttributes/AttributeRowWrapper';
import Required from '../../../../../../../../admin/src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Required';
import useFillRequiredPermissions from '../../useFillRequiredPermissions';

const AttributeRow = ({ attribute, contentType }) => {
  const {
    dispatch,
    collapsePath,
    components,
    contentTypesPermissions,
    isSuperAdmin,
  } = usePermissionsContext();
  const fillRequiredPermissions = useFillRequiredPermissions(contentType);

  const isCollapsable = attribute.type === 'component';
  const isActive = collapsePath[1] === attribute.attributeName;
  const attributeActions = get(
    contentTypesPermissions,
    [contentType.uid, 'attributes', attribute.attributeName, 'actions'],
    []
  );

  const recursivePermissions = useMemo(() => {
    return getRecursivePermissions(
      contentType.uid,
      attribute.attributeName,
      contentTypesPermissions
    );
  }, [contentType, contentTypesPermissions, attribute]);

  const recursiveAttributes = useMemo(() => {
    const component = components.find(component => component.uid === attribute.component);

    return isCollapsable
      ? getAttributesByModel(component, components, attribute.attributeName)
      : [attribute];
  }, [isCollapsable, attribute, components]);

  const hasAllActions = useMemo(() => {
    return recursivePermissions === staticAttributeActions.length * recursiveAttributes.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTypesPermissions]);

  const hasSomeActions = useMemo(() => {
    return (
      recursivePermissions > 0 &&
      recursivePermissions < staticAttributeActions.length * recursiveAttributes.length
    );
  }, [recursiveAttributes, recursivePermissions]);

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(components.find(comp => comp.uid === attribute.component));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute]);

  const handleCheckAllAction = useCallback(() => {
    fillRequiredPermissions();

    if (isCollapsable) {
      const attributes = recursiveAttributes;
      const allActionsSize = attributes.length * staticAttributeActions.length;
      const shouldEnable = recursivePermissions >= 0 && recursivePermissions < allActionsSize;

      dispatch({
        type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
        subject: contentType.uid,
        attributes,
        shouldEnable,
      });
    } else {
      dispatch({
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: contentType.uid,
        attribute,
        shouldEnable: !hasAllActions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute, contentType.uid, isCollapsable, recursiveAttributes, recursivePermissions]);

  const getRecursiveAttributesPermissions = useCallback(
    action => {
      return getNumberOfRecursivePermissionsByAction(
        contentType.uid,
        action,
        isCollapsable
          ? `${attribute.attributeName}.`
          : attribute.attributeName.substr(0, attribute.attributeName.lastIndexOf('.')),
        contentTypesPermissions
      );
    },
    [attribute, contentType, contentTypesPermissions, isCollapsable]
  );

  const checkPermission = useCallback(
    action => {
      return attributeActions.findIndex(permAction => permAction === action) !== -1;
    },
    [attributeActions]
  );

  const allRecursiveChecked = action => {
    return (
      isCollapsable && getRecursiveAttributesPermissions(action) === recursiveAttributes.length
    );
  };

  const handleCheck = useCallback(
    action => {
      const shouldSetRequiredFields = action === `${contentManagerPermissionPrefix}.create`;

      if (shouldSetRequiredFields) {
        fillRequiredPermissions();
      }

      if (isCollapsable) {
        dispatch({
          type: 'SELECT_MULTIPLE_ATTRIBUTE',
          subject: contentType.uid,
          shouldEnable: !allRecursiveChecked(action),
          attributes:
            action === `${contentManagerPermissionPrefix}.create`
              ? recursiveAttributes.filter(attribute => !attribute.required)
              : recursiveAttributes,
          action,
        });
      } else {
        dispatch({
          type: 'SELECT_ACTION',
          subject: contentType.uid,
          attribute: attribute.attributeName,
          action,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      contentType,
      contentTypesPermissions,
      isCollapsable,
      components,
      allRecursiveChecked,
      recursiveAttributes,
      attribute,
    ]
  );

  const handleToggleAttributes = () => {
    if (isCollapsable) {
      dispatch({
        type: 'COLLAPSE_PATH',
        index: 1,
        value: attribute.attributeName,
      });
    }
  };

  const someChecked = action => {
    return (
      isCollapsable &&
      getRecursiveAttributesPermissions(action) > 0 &&
      getRecursiveAttributesPermissions(action) < recursiveAttributes.length
    );
  };

  return (
    <>
      <AttributeRowWrapper isActive={isActive} isCollapsable={isCollapsable} alignItems="center">
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName disabled={isSuperAdmin} width="15rem">
            <Checkbox
              disabled={isSuperAdmin}
              name={attribute.attributeName}
              value={hasAllActions}
              someChecked={hasSomeActions}
              onChange={handleCheckAllAction}
            />
            <CollapseLabel
              title={attribute.attributeName}
              alignItems="center"
              isCollapsable={isCollapsable}
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
          </PermissionName>
          <PermissionWrapper>
            {staticAttributeActions.map(action => (
              <PermissionCheckbox
                key={action}
                disabled={
                  isSuperAdmin || (isCreateAndRequired(attribute, action) && !isCollapsable)
                }
                value={
                  isCreateAndRequired(attribute, action) ||
                  allRecursiveChecked(action) ||
                  checkPermission(action)
                }
                name={`${attribute.attributeName}-${action}`}
                onChange={() => handleCheck(action)}
                someChecked={someChecked(action)}
              />
            ))}
          </PermissionWrapper>
        </Flex>
      </AttributeRowWrapper>
      {isActive && (
        <ComponentsAttributes contentType={contentType} attributes={attributesToDisplay} />
      )}
    </>
  );
};

AttributeRow.propTypes = {
  attribute: PropTypes.object.isRequired,
  contentType: PropTypes.object.isRequired,
};

export default AttributeRow;
