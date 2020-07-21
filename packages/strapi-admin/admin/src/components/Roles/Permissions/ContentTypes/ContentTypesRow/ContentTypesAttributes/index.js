import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Padded, Flex, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import AttributeRow from 'ee_else_ce/components/Roles/Permissions/ContentTypes/ContentTypesRow/ContentTypesAttributes/AttributeRow';

import { ATTRIBUTES_PERMISSIONS_ACTIONS } from '../../../utils/permissonsConstantsActions';
import Wrapper from './Wrapper';

// Those styles are very specific.
// so it is not a big problem to use custom paddings and widths.
const ActionTitle = styled.div`
  width: 12rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
`;
const AttributesTitleWrapper = styled.div`
  width: 18rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  padding-left: 3.5rem;
`;

const ContentTypesAttributes = ({ attributes, contentType, withPadding }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper withPadding={withPadding}>
      <Flex>
        <AttributesTitleWrapper>
          <Text fontWeight="bold">
            {formatMessage({
              id: 'Settings.roles.form.permissions.attributesPermissions',
              defaultMessage: 'Attributes permissions',
            })}
          </Text>
        </AttributesTitleWrapper>
        {ATTRIBUTES_PERMISSIONS_ACTIONS.map(action => (
          <ActionTitle key={action}>
            <Text textTransform="capitalize" fontWeight="bold">
              {formatMessage({
                id: `Settings.roles.form.permissions.${action}`,
                defaultMessage: action,
              })}
            </Text>
          </ActionTitle>
        ))}
      </Flex>
      <Padded left size="md">
        {attributes.map(attribute => (
          <AttributeRow
            contentType={contentType}
            attribute={attribute}
            key={attribute.attributeName}
          />
        ))}
      </Padded>
    </Wrapper>
  );
};

ContentTypesAttributes.defaultProps = {
  withPadding: false,
};
ContentTypesAttributes.propTypes = {
  attributes: PropTypes.array.isRequired,
  contentType: PropTypes.object.isRequired,
  withPadding: PropTypes.bool,
};

export default ContentTypesAttributes;
