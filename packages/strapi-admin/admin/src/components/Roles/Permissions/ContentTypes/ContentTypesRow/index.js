import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Flex, Text, Padded } from '@buffetjs/core';
import Chevron from './Chevron';
import PermissionCheckbox from '../PermissionCheckbox';
import PermissionName from './PermissionName';
import StyledRow from './StyledRow';
import Attributes from './Attributes';
import PermissionWrapper from './PermissionWrapper';
import CollapseLabel from '../CollapseLabel';

const ContentTypeRow = ({
  contentType,
  index,
  openContentTypeAttributes,
  openedContentTypeAttributes,
}) => {
  const isActive = openedContentTypeAttributes === contentType.name;

  const handleToggleAttributes = () => {
    openContentTypeAttributes(contentType.name);
  };

  return (
    <>
      <StyledRow isActive={isActive} isGrey={index % 2 === 0}>
        <Flex style={{ flex: 1 }}>
          <Padded left size="sm" />
          <PermissionName>
            <Checkbox someChecked />
            <CollapseLabel
              title={contentType.name}
              alignItems="center"
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
            <PermissionCheckbox />
            <PermissionCheckbox />
            <PermissionCheckbox />
            <PermissionCheckbox />
          </PermissionWrapper>
        </Flex>
      </StyledRow>
      {isActive && <Attributes attributes={contentType.schema.attributes} />}
    </>
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
