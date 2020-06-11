import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Padded, Flex, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import AttributeRow from './AttributeRow';
import Wrapper from './Wrapper';

// Those styles are very specific.
// so it is not a big problem to use custom paddings and widths.
const ActionTitle = styled.div`
  width: 12rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
`;
const FieldsTitleWrapper = styled.div`
  width: 18rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  padding-left: 3.5rem;
`;

const ContentTypesAttributes = ({ attributes }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper>
      <Flex>
        <FieldsTitleWrapper>
          <Text fontWeight="bold">
            {formatMessage({
              id: 'Settings.roles.form.permissions.fieldsPermissions',
              defaultMessage: 'Fields permissions',
            })}
          </Text>
        </FieldsTitleWrapper>
        <ActionTitle>
          <Text fontWeight="bold">
            {formatMessage({
              id: 'Settings.roles.form.permissions.create',
              defaultMessage: 'Create',
            })}
          </Text>
        </ActionTitle>
        <ActionTitle>
          <Text fontWeight="bold">
            {formatMessage({
              id: 'Settings.roles.form.permissions.read',
              defaultMessage: 'Read',
            })}
          </Text>
        </ActionTitle>
        <ActionTitle>
          <Text fontWeight="bold">
            {formatMessage({
              id: 'Settings.roles.form.permissions.update',
              defaultMessage: 'Update',
            })}
          </Text>
        </ActionTitle>
      </Flex>
      <Padded left size="md">
        {attributes.map(attribute => (
          <AttributeRow attribute={attribute} key={attribute.attributeName} />
        ))}
      </Padded>
    </Wrapper>
  );
};

ContentTypesAttributes.propTypes = {
  attributes: PropTypes.array.isRequired,
};

export default ContentTypesAttributes;
