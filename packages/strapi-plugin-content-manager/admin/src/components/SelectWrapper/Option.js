import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import PropTypes from 'prop-types';
import { get, isEmpty } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import RelationDPState from '../RelationDPState';

const TextGrow = styled(Text)`
  flex-grow: 2;
`;

const Option = props => {
  const Component = components.Option;
  const hasDraftAndPublish = props.selectProps.hasDraftAndPublish;
  const isDraft = isEmpty(get(props, 'data.value.published_at'));

  if (hasDraftAndPublish) {
    return (
      <Component {...props}>
        <Flex>
          <RelationDPState
            marginLeft="0"
            marginTop="1px"
            marginRight="10px"
            isDraft={isDraft}
            marginBottom="0"
          />

          <TextGrow ellipsis as="div">
            {props.label}
          </TextGrow>
        </Flex>
      </Component>
    );
  }

  return (
    <Component {...props}>
      <Text ellipsis>{props.label}</Text>
    </Component>
  );
};

Option.propTypes = {
  label: PropTypes.string.isRequired,
  selectProps: PropTypes.shape({
    hasDraftAndPublish: PropTypes.bool,
  }).isRequired,
};

export default Option;
