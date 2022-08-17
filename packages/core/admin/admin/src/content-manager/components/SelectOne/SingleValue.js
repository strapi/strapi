import React from 'react';
import { components } from 'react-select';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { pxToRem } from '@strapi/helper-plugin';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import get from 'lodash/get';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import { getTrad } from '../../utils';

const StyledBullet = styled.div`
  flex-shrink: 0;
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  margin-right: ${({ theme }) => theme.spaces[2]};
  background-color: ${({ theme, isDraft }) =>
    theme.colors[isDraft ? 'secondary600' : 'success600']};
  border-radius: 50%;
  cursor: pointer;
`;

const SingleValue = (props) => {
  const { formatMessage } = useIntl();
  const Component = components.SingleValue;
  const hasDraftAndPublish = has(get(props, 'data.value'), 'publishedAt');
  const isDraft = isEmpty(get(props, 'data.value.publishedAt'));

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
        <Flex>
          <StyledBullet title={title} isDraft={isDraft} />
          <Typography ellipsis>{props.data.label || '-'}</Typography>
        </Flex>
      </Component>
    );
  }

  return <Component {...props}>{props.data.label || '-'}</Component>;
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
