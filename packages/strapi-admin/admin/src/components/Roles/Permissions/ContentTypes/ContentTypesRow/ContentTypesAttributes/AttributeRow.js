import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text, Checkbox, Padded } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../../../hooks';
import { getAttributesToDisplay } from '../../../../../../utils';
import {
  contentManagerPermissionPrefix,
  getNumberOfRecursivePermissionsByAction,
  getAttributesByModel,
  getRecursivePermissions,
  ATTRIBUTES_PERMISSIONS_ACTIONS,
} from '../../../utils';
import PermissionCheckbox from '../../PermissionCheckbox';
import PermissionName from '../PermissionName';
import CollapseLabel from '../../CollapseLabel';
import ComponentsAttributes from '../ComponentsAttributes';
import Chevron from '../Chevron';
import PermissionWrapper from '../PermissionWrapper';
import AttributeRowWrapper from './AttributeRowWrapper';
import Required from '../Required';

const AttributeRow = ({ attribute, contentType }) => {
  const {
    onCollapse,
    collapsePath,
    components,
    permissions,
    onAllContentTypeActions,
    onAllAttributeActionsSelect,
  } = usePermissionsContext();
  const isCollapsable = attribute.type === 'component';
  const isActive = collapsePath[1] === attribute.attributeName;
  const attributeActions = get(
    permissions,
    [contentType.uid, 'attributes', attribute.attributeName, 'actions'],
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
      const attributesToAdd = getRecursiveAttributes();
      const allActionsSize = attributesToAdd.length * ATTRIBUTES_PERMISSIONS_ACTIONS.length;

      onAllContentTypeActions({
        subject: contentType.uid,
        attributes: attributesToAdd,
        shouldEnable: recursivePermissions >= 0 && recursivePermissions < allActionsSize,
        shouldSetAllContentTypes: false,
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
      return getNumberOfRecursivePermissionsByAction(
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
        isRequired={attribute.required && !isCollapsable}
        isActive={isActive}
        isCollapsable={isCollapsable}
        alignItems="center"
      >
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName width="15rem">
            <Checkbox
              disabled={attribute.required && !isCollapsable}
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
          <PermissionWrapper disabled>
            {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
              <PermissionCheckbox
                key={action}
                disabled
                value={
                  allRecursiveChecked(`${contentManagerPermissionPrefix}.${action}`) ||
                  checkPermission(`${contentManagerPermissionPrefix}.${action}`)
                }
                name={`${attribute.attributeName}-${action}`}
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
