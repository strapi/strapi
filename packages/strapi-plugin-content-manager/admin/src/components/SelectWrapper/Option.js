import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { get, has, isEmpty } from 'lodash';
import { Flex, Text } from '@buffetjs/core';
import { getTrad } from '../../utils';
import RelationDPState from '../RelationDPState';

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

          <TextGrow ellipsis as="div" fontWeight={fontWeight}>
            {props.label}&nbsp;
          </TextGrow>
        </Flex>
      </Component>
    );
  }

  return (
    <Component {...props}>
      <Text ellipsis fontWeight={fontWeight}>
        {props.label}
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
  }).isRequired,
};

export default Option;
