import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import { getAttributesToDisplay } from '../../../../../../utils';
import { usePermissionsContext } from '../../../../../../hooks';
import {
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  CONTENT_MANAGER_PREFIX,
  getAttributesByModel,
  getNumberOfRecursivePermissionsByAction,
  getRecursivePermissions,
} from '../../../utils';
import AttributeRowWrapper from './AttributeRowWrapper';
import Chevron from '../Chevron';
import CollapseLabel from '../../CollapseLabel';
import ComponentsAttributes from '../ComponentsAttributes';
import PermissionCheckbox from '../../PermissionCheckbox';
import PermissionName from '../PermissionName';
import PermissionWrapper from '../PermissionWrapper';
import Required from '../Required';
import useFillRequiredPermissions from '../../useFillRequiredPermissions';

const AttributeRow = ({ attribute, contentType }) => {
  const {
    collapsePath,
    components,
    contentTypesPermissions,
    dispatch,
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
    return (
      recursivePermissions === ATTRIBUTES_PERMISSIONS_ACTIONS.length * recursiveAttributes.length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTypesPermissions]);

  const hasSomeActions = useMemo(() => {
    return (
      recursivePermissions > 0 &&
      recursivePermissions < ATTRIBUTES_PERMISSIONS_ACTIONS.length * recursiveAttributes.length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTypesPermissions]);

  const handleCheckAllAction = ({ target: { value } }) => {
    fillRequiredPermissions();

    if (isCollapsable) {
      const attributes = recursiveAttributes;
      dispatch({
        type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
        subject: contentType.uid,
        attributes,
        shouldEnable: value,
        shouldSetAllContentTypes: false,
        shouldAddDeleteAction: true,
      });
    } else {
      dispatch({
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: contentType.uid,
        attribute,
        shouldEnable: value,
      });
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute, contentTypesPermissions]
  );

  const checkPermission = useCallback(
    action => {
      return attributeActions.findIndex(permAction => permAction === action) !== -1;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentTypesPermissions, attribute, contentType]
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

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(components.find(comp => comp.uid === attribute.component));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute]);

  const someChecked = action => {
    return (
      isCollapsable &&
      getRecursiveAttributesPermissions(action) > 0 &&
      getRecursiveAttributesPermissions(action) < recursiveAttributes.length
    );
  };

  const allRecursiveChecked = action => {
    return (
      isCollapsable && getRecursiveAttributesPermissions(action) === recursiveAttributes.length
    );
  };

  return (
    <>
      <AttributeRowWrapper isActive={isActive} isCollapsable={isCollapsable} alignItems="center">
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName
            disabled={isSuperAdmin || (attribute.required && !isCollapsable)}
            width="15rem"
          >
            <Checkbox
              disabled={isSuperAdmin || (attribute.required && !isCollapsable)}
              name={attribute.attributeName}
              onChange={handleCheckAllAction}
              someChecked={hasSomeActions}
              value={attribute.required || hasAllActions}
            />
            <CollapseLabel
              alignItems="center"
              isCollapsable={isCollapsable}
              onClick={handleToggleAttributes}
              title={attribute.attributeName}
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
          <PermissionWrapper disabled>
            {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
              <PermissionCheckbox
                key={action}
                disabled
                value={
                  attribute.required ||
                  allRecursiveChecked(`${CONTENT_MANAGER_PREFIX}.${action}`) ||
                  checkPermission(`${CONTENT_MANAGER_PREFIX}.${action}`)
                }
                name={`${attribute.attributeName}-${action}`}
                someChecked={someChecked(`${CONTENT_MANAGER_PREFIX}.${action}`)}
              />
            ))}
          </PermissionWrapper>
        </Flex>
      </AttributeRowWrapper>
      {isActive && <ComponentsAttributes attributes={attributesToDisplay} />}
    </>
  );
};

AttributeRow.propTypes = {
  attribute: PropTypes.object.isRequired,
  contentType: PropTypes.object.isRequired,
};

export default AttributeRow;
