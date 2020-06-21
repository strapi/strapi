import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../../src/hooks';
import { getAttributesToDisplay } from '../../../../../../../src/utils';
import {
  contentManagerPermissionPrefix,
  getRecursivePermissionsByAction,
  getAttributesByModel,
  getAllAttributesActionsSize,
  getRecursivePermissions,
  ATTRIBUTES_PERMISSIONS_ACTIONS,
} from '../../../../../../../src/components/Roles/Permissions/utils';
import PermissionCheckbox from '../../../../../../../src/components/Roles/Permissions/ContentTypes/PermissionCheckbox';
import PermissionName from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionName';
import CollapseLabel from '../../../../../../../src/components/Roles/Permissions/ContentTypes/CollapseLabel';
import ComponentsAttributes from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ComponentsAttributes';
import Chevron from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Chevron';
import PermissionWrapper from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/PermissionWrapper';
import AttributeRowWrapper from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/ContentTypesAttributes/AttributeRowWrapper';
import Required from '../../../../../../../src/components/Roles/Permissions/ContentTypes/ContentTypesRow/Required';

const AttributeRow = ({ attribute, contentType }) => {
  const {
    onCollapse,
    collapsePath,
    components,
    permissions,
    onAttributePermissionSelect,
    onAllContentTypeActions,
    onAllAttributeActionsSelect,
    onContentTypeAttributesActionSelect,
  } = usePermissionsContext();
  const isCollapsable = attribute.type === 'component';
  const isActive = collapsePath[1] === attribute.attributeName;
  const attributeActions = get(
    permissions,
    [contentType.uid, attribute.attributeName, 'actions'],
    []
  );

  const recursivePermissions = useMemo(() => {
    return getRecursivePermissions(contentType.uid, attribute.attributeName, permissions);
  }, [contentType, permissions, attribute]);

  const getRecursiveAttributes = useCallback(() => {
    const component = components.find(component => component.uid === attribute.component);

    return [...getAttributesByModel(component, components, attribute.attributeName), attribute];
  }, [attribute, components]);

  const hasAllActions = useMemo(() => {
    return (
      recursivePermissions ===
      ATTRIBUTES_PERMISSIONS_ACTIONS.length * getRecursiveAttributes().length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  const hasSomeActions = useMemo(() => {
    return (
      recursivePermissions > 0 &&
      recursivePermissions < ATTRIBUTES_PERMISSIONS_ACTIONS.length * getRecursiveAttributes().length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  const handleCheckAllAction = () => {
    if (isCollapsable) {
      const allCurrentActionsSize = getAllAttributesActionsSize(contentType.uid, permissions);
      const attributeToAdd = getRecursiveAttributes();

      const allActionsSize = attributeToAdd.length * ATTRIBUTES_PERMISSIONS_ACTIONS.length;

      onAllContentTypeActions({
        subject: contentType.uid,
        attributes: attributeToAdd,
        shouldEnable: allCurrentActionsSize >= 0 && allCurrentActionsSize < allActionsSize,
        addContentTypeActions: false,
      });
    } else {
      onAllAttributeActionsSelect({
        subject: contentType.uid,
        attribute: attribute.attributeName,
      });
    }
  };

  const getRecursiveAttributesPermissions = useCallback(
    action => {
      return getRecursivePermissionsByAction(
        collapsePath[0],
        action,
        attribute.attributeName,
        permissions
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute, permissions]
  );

  const checkPermission = useCallback(
    action => {
      return attributeActions.findIndex(permAction => permAction === action) !== -1;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions, attribute, contentType]
  );

  const handleCheck = useCallback(
    action => {
      if (isCollapsable) {
        onContentTypeAttributesActionSelect({
          action,
          subject: collapsePath[0],
          attributes: getRecursiveAttributes(),
          shouldEnable: !allRecursiveChecked(action),
        });
      } else {
        onAttributePermissionSelect({
          subject: contentType.uid,
          action,
          attribute: attribute.attributeName,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute, collapsePath, contentType, isCollapsable, permissions]
  );

  const handleToggleAttributes = () => {
    if (isCollapsable) {
      onCollapse(1, attribute.attributeName);
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
      getRecursiveAttributesPermissions(action) < getRecursiveAttributes().length
    );
  };

  const allRecursiveChecked = action => {
    return (
      isCollapsable && getRecursiveAttributesPermissions(action) === getRecursiveAttributes().length
    );
  };

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
            <Checkbox
              disabled={attribute.required}
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
            {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
              <PermissionCheckbox
                key={action}
                disabled={attribute.required}
                value={
                  allRecursiveChecked(`${contentManagerPermissionPrefix}.${action}`) ||
                  checkPermission(`${contentManagerPermissionPrefix}.${action}`)
                }
                name={`${attribute.attributeName}-${action}`}
                onChange={() => handleCheck(`${contentManagerPermissionPrefix}.${action}`)}
                someChecked={someChecked(`${contentManagerPermissionPrefix}.${action}`)}
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
