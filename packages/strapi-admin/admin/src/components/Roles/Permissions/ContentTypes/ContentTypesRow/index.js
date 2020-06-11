import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';

import { getAttributesToDisplay } from '../../../../../utils';
import { usePermissionsContext } from '../../../../../hooks';
import Chevron from './Chevron';
import PermissionCheckbox from '../PermissionCheckbox';
import PermissionName from './PermissionName';
import StyledRow from './StyledRow';
import ContentTypesAttributes from './ContentTypesAttributes';
import PermissionWrapper from './PermissionWrapper';
import CollapseLabel from '../CollapseLabel';

const ContentTypeRow = ({ index, contentType }) => {
  const { collapsePath, onCollapse } = usePermissionsContext();
  const isActive = collapsePath[0] === contentType.name;

  const handleToggleAttributes = () => {
    onCollapse(0, contentType.name);
  };

  const attributesToDisplay = useMemo(() => {
    return getAttributesToDisplay(contentType);
  }, [contentType]);

  return (
    <>
      <StyledRow isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName>
            <Checkbox name={contentType.name} someChecked />
            <CollapseLabel
              title={contentType.name}
              alignItems="center"
              isCollapsable
              onClick={handleToggleAttributes}
            >
              <Text
                color="grey"
                ellipsis
                fontSize="xs"
                fontWeight="bold"
                lineHeight="20px"
                textTransform="uppercase"
              >
                {contentType.name}
              </Text>
              <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
            </CollapseLabel>
          </PermissionName>
          <PermissionWrapper>
            <PermissionCheckbox hasConditions name={`${contentType.name}-create`} />
            <PermissionCheckbox name={`${contentType.name}-read`} />
            <PermissionCheckbox name={`${contentType.name}-update`} />
            <PermissionCheckbox name={`${contentType.name}-delete`} />
          </PermissionWrapper>
        </Flex>
      </StyledRow>
      {isActive && <ContentTypesAttributes attributes={attributesToDisplay} />}
    </>
  );
};

ContentTypeRow.propTypes = {
  contentType: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

export default ContentTypeRow;
