import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import styled from 'styled-components';

import { usePermissionsContext } from '../../../../../../hooks';
import { getAttributesToDisplay } from '../../../../../../utils';
import {
  ATTRIBUTES_PERMISSIONS_ACTIONS,
  CONTENT_MANAGER_PREFIX,
  getAttributesByModel,
  getNumberOfRecursivePermissionsByAction,
} from '../../../utils';
import Chevron from '../Chevron';
import CollapseLabel from '../../CollapseLabel';
import Curve from './Curve';
import PermissionCheckbox from '../../PermissionCheckbox';
import PermissionWrapper from '../PermissionWrapper';
import Required from '../Required';
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
  const { components, dispatch, contentTypesPermissions, collapsePath } = usePermissionsContext();
  const isCollapsable = attribute.type === 'component';
  const contentTypeUid = collapsePath[0];
  const isActive = collapsePath[recursiveLevel + 2] === attribute.attributeName;

  const attributePermissionName = useMemo(
    () => [...collapsePath.slice(1), attribute.attributeName].join('.'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attribute]
  );

  const attributeActions = get(
    contentTypesPermissions,
    [contentTypeUid, 'attributes', attributePermissionName, 'actions'],
    []
  );

  const recursiveAttributes = useMemo(() => {
    const component = components.find(component => component.uid === attribute.component);

    return isCollapsable
      ? getAttributesByModel(component, components, attributePermissionName)
      : [attribute];
  }, [components, isCollapsable, attributePermissionName, attribute]);

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

  return (
    <LeftBorderTimeline isVisible={index + 1 < numberOfAttributes}>
      <AttributeRowWrapper isSmall={attribute.component || index + 1 === numberOfAttributes}>
        <Curve fill="#a5d5ff" />
        <Flex style={{ flex: 1 }}>
          <RowStyle
            isActive={isActive}
            isCollapsable={attribute.component}
            isRequired={attribute.required && !isCollapsable}
            level={recursiveLevel}
          >
            <CollapseLabel
              alignItems="center"
              isCollapsable={attribute.component}
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
          </RowStyle>
          <PermissionWrapper disabled>
            {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
              <PermissionCheckbox
                disabled
                key={`${attribute.attributeName}-${action}`}
                someChecked={someChecked(`${CONTENT_MANAGER_PREFIX}.${action}`)}
                value={
                  attribute.required ||
                  allRecursiveChecked(`${CONTENT_MANAGER_PREFIX}.${action}`) ||
                  checkPermission(`${CONTENT_MANAGER_PREFIX}.${action}`)
                }
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
