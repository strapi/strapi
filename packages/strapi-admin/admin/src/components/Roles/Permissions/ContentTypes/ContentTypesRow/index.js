import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';

import PermissionCheckbox from '../PermissionCheckbox';
import PermissionName from './PermissionName';
import Chevron from './Chevron';
import StyledRow from './StyledRow';

// No need to create an other file for this style. It will be used only in this file.
const CollapseLabel = styled(Flex)`
  cursor: pointer;
`;

const ContentTypeRow = ({
  openContentTypeAttributes,
  openedContentTypeAttributes,
  contentType,
  index,
}) => {
  const isActive = openedContentTypeAttributes === contentType.name;

  const handleToggleAttributes = () => {
    openContentTypeAttributes(contentType.name);
  };

  return (
    <StyledRow isActive={isActive} isGrey={index % 2 === 0}>
      <Flex>
        <Padded left size="sm" />
        <PermissionName>
          <Checkbox someChecked />
          <CollapseLabel alignItems="center" onClick={handleToggleAttributes}>
            <Text
              color="grey"
              fontWeight="bold"
              fontSize="xs"
              textTransform="uppercase"
              lineHeight="20px"
            >
              {contentType.name}
            </Text>
            <Chevron icon={isActive ? 'chevron-up' : 'chevron-down'} />
          </CollapseLabel>
        </PermissionName>
        <PermissionCheckbox />
        <PermissionCheckbox />
        <PermissionCheckbox />
        <PermissionCheckbox />
        <PermissionCheckbox />
      </Flex>
    </StyledRow>
  );
};

ContentTypeRow.defaultProps = {
  openedContentTypeAttributes: null,
};
ContentTypeRow.propTypes = {
  contentType: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  openContentTypeAttributes: PropTypes.func.isRequired,
  openedContentTypeAttributes: PropTypes.string,
};

export default ContentTypeRow;
