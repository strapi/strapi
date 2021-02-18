import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../../../admin/src/hooks';
import { getAttributesToDisplay } from '../../../../../../../../admin/src/utils';
import {
  CONTENT_MANAGER_PREFIX,
  getNumberOfRecursivePermissionsByAction,
  getAttributesByModel,
  getRecursivePermissions,
  STATIC_ATTRIBUTE_ACTIONS,
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
    return recursivePermissions === STATIC_ATTRIBUTE_ACTIONS.length * recursiveAttributes.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTypesPermissions]);

  const hasSomeActions = useMemo(() => {
    return (
      recursivePermissions > 0 &&
      recursivePermissions < STATIC_ATTRIBUTE_ACTIONS.length * recursiveAttributes.length
    );
  }, [recursiveAttributes, recursivePermissions]);

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(components.find(comp => comp.uid === attribute.component));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute]);

  const handleCheckAllAction = useCallback(
    ({ target: { name, value } }) => {
      fillRequiredPermissions();

      if (isCollapsable) {
        dispatch({
          type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
          subject: name,
          attributes: recursiveAttributes,
          shouldEnable: value,
        });
      } else {
        dispatch({
          type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
          subject: name,
          attribute,
          shouldEnable: value,
        });
      }
    },
    [attribute, dispatch, fillRequiredPermissions, isCollapsable, recursiveAttributes]
  );

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

  const allRecursiveChecked = useCallback(
    action => {
      return (
        isCollapsable && getRecursiveAttributesPermissions(action) === recursiveAttributes.length
      );
    },
    [getRecursiveAttributesPermissions, isCollapsable, recursiveAttributes]
  );

  const handleCheckCollapsable = useCallback(
    ({ target: { value, name } }, action) => {
      const shouldSetRequiredFields = action === `${CONTENT_MANAGER_PREFIX}.create`;

      if (shouldSetRequiredFields) {
        fillRequiredPermissions();
      }

      dispatch({
        type: 'SELECT_MULTIPLE_ATTRIBUTE',
        subject: name,
        shouldEnable: value,
        attributes:
          action === `${CONTENT_MANAGER_PREFIX}.create`
            ? recursiveAttributes.filter(attribute => !attribute.required)
            : recursiveAttributes,
        action,
      });
    },
    [dispatch, fillRequiredPermissions, recursiveAttributes]
  );

  const handleCheck = useCallback(
    action => {
      const shouldSetRequiredFields = action === `${CONTENT_MANAGER_PREFIX}.create`;

      if (shouldSetRequiredFields) {
        fillRequiredPermissions();
      }

      dispatch({
        type: 'SELECT_ACTION',
        subject: contentType.uid,
        attribute: attribute.attributeName,
        action,
      });
    },
    [dispatch, contentType.uid, attribute.attributeName, fillRequiredPermissions]
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

  const handleChange = (e, action) => {
    if (isCollapsable) {
      handleCheckCollapsable(e, action);
    } else {
      handleCheck(action);
    }
  };

  return (
    <>
      <AttributeRowWrapper isActive={isActive} isCollapsable={isCollapsable} alignItems="center">
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName disabled={isSuperAdmin} width="15rem">
            <Checkbox
              disabled={isSuperAdmin}
              name={contentType.uid}
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
            {STATIC_ATTRIBUTE_ACTIONS.map(action => (
              <PermissionCheckbox
                key={action}
                disabled={
                  isSuperAdmin || (isCreateAndRequired(attribute, action) && !isCollapsable)
                }
                value={
                  (isCreateAndRequired(attribute, action) && !isCollapsable) ||
                  allRecursiveChecked(action) ||
                  checkPermission(action)
                }
                name={contentType.uid}
                onChange={e => handleChange(e, action)}
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
