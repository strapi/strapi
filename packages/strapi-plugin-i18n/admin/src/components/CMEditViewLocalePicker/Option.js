import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { Flex, Text } from '@buffetjs/core';
import { RelationDPState } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';

const TextGrow = styled(Text)`
  flex-grow: 2;
`;

const statusToTitleMap = {
  draft: 'content-manager.components.Select.draft-info-title',
  published: 'content-manager.components.Select.publish-info-title',
  'did-not-create-locale': getTrad('components.Select.locales.not-available'),
};

const Option = props => {
  const { formatMessage } = useIntl();
  const Component = components.Option;
  const options = get(props, ['selectProps', 'options'], {});
  const currentOption = options.find(option => option.value === props.value);
  const titleLabelID = statusToTitleMap[currentOption.status];
  const title = formatMessage({ id: titleLabelID });
  const fontWeight = props.isFocused ? 'bold' : 'regular';

  return (
    <Component {...props}>
      <Flex>
        <RelationDPState
          {...currentOption}
          marginLeft="0"
          marginTop="1px"
          marginRight="10px"
          marginBottom="0"
          title={title}
        />

        <TextGrow ellipsis as="div" fontWeight={fontWeight} title={props.label}>
          {props.label}&nbsp;
        </TextGrow>
      </Flex>
    </Component>
  );
};

Option.defaultProps = {};

Option.propTypes = {
  label: PropTypes.string.isRequired,
  isFocused: PropTypes.bool.isRequired,
  selectProps: PropTypes.shape({
    options: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
      }).isRequired
    ).isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
};

export default Option;
