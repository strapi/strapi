import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { get, has, isEmpty } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import { RelationDPState } from 'strapi-helper-plugin';
import { getDisplayedValue, getTrad } from '../../utils';

const TextGrow = styled(Text)`
  flex-grow: 2;
`;

const Option = props => {
  const { formatMessage } = useIntl();
  const Component = components.Option;
  const hasDraftAndPublish = has(get(props, 'data.value'), 'published_at');
  const isDraft = isEmpty(get(props, 'data.value.published_at'));
  const titleLabelID = isDraft
    ? 'components.Select.draft-info-title'
    : 'components.Select.publish-info-title';
  const title = formatMessage({ id: getTrad(titleLabelID) });
  const fontWeight = props.isFocused ? 'bold' : 'regular';
  const mainField = get(props, ['selectProps', 'mainField'], {});
  const value = getDisplayedValue(mainField.schema.type, props.label, mainField.name);

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
            title={title}
          />

          <TextGrow ellipsis as="div" fontWeight={fontWeight} title={value}>
            {value}&nbsp;
          </TextGrow>
        </Flex>
      </Component>
    );
  }

  return (
    <Component {...props}>
      <Text ellipsis fontWeight={fontWeight} title={value}>
        {value}
      </Text>
    </Component>
  );
};

Option.defaultProps = {
  label: '',
};

Option.propTypes = {
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isFocused: PropTypes.bool.isRequired,
  selectProps: PropTypes.shape({
    hasDraftAndPublish: PropTypes.bool,
    mainField: PropTypes.shape({
      name: PropTypes.string.isRequired,
      schema: PropTypes.shape({
        type: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};

export default Option;
