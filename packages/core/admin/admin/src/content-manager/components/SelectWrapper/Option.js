import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { get, has, isEmpty } from 'lodash';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { pxToRem } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';

const StyledBullet = styled.div`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  margin-right: ${({ theme }) => theme.spaces[2]};
  background: ${({ theme, isDraft }) => theme.colors[isDraft ? 'secondary700' : 'success200']};
  border-radius: 50%;
  cursor: pointer;
`;

const Option = props => {
  const { formatMessage } = useIntl();
  const Component = components.Option;
  const hasDraftAndPublish = has(get(props, 'data.value'), 'publishedAt');
  const isDraft = isEmpty(get(props, 'data.value.publishedAt'));

  if (hasDraftAndPublish) {
    if (hasDraftAndPublish) {
      const draftMessage = {
        id: getTrad('components.Select.draft-info-title'),
        defaultMessage: 'State: Draft',
      };
      const publishedMessage = {
        id: getTrad('components.Select.publish-info-title'),
        defaultMessage: 'State: Published',
      };
      const title = isDraft ? formatMessage(draftMessage) : formatMessage(publishedMessage);

      return (
        <Component {...props}>
          <Row>
            <StyledBullet title={title} isDraft={isDraft} />
            <Text ellipsis>{props.label || '-'}</Text>
          </Row>
        </Component>
      );
    }
  }

  return <Component {...props}>{props.label || '-'}</Component>;
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
