import React from 'react';
import { components } from 'react-select';
import PropTypes from 'prop-types';
import { get, has, isEmpty } from 'lodash';
import { Flex, Padded, Text } from '@buffetjs/core';
import { RelationDPState } from 'strapi-helper-plugin';
import { getDisplayedValue } from '../../utils';

const SingleValue = props => {
  const Component = components.SingleValue;
  const hasDraftAndPublish = has(get(props, 'data.value'), 'published_at');
  const isDraft = isEmpty(get(props, 'data.value.published_at'));
  const mainField = get(props, ['selectProps', 'mainField'], {});
  const value = getDisplayedValue(mainField.schema.type, props.data.label, mainField.name);

  if (hasDraftAndPublish) {
    return (
      <Component {...props}>
        <Padded left size="sm" right>
          <Flex>
            <RelationDPState
              marginLeft="0"
              marginTop="1px"
              marginRight="10px"
              isDraft={isDraft}
              marginBottom="0"
            />
            <div>
              <Text ellipsis>{value}</Text>
            </div>
          </Flex>
        </Padded>
      </Component>
    );
  }

  return (
    <Component {...props}>
      <Padded left right size="sm">
        {value}
      </Padded>
    </Component>
  );
};

SingleValue.propTypes = {
  data: PropTypes.object.isRequired,
  selectProps: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string.isRequired,
      schema: PropTypes.shape({
        type: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};

export default SingleValue;
