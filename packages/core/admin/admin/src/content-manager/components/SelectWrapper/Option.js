import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { get, has, isEmpty } from 'lodash';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { pxToRem } from '@strapi/helper-plugin';
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

const Option = (props) => {
  const { formatMessage } = useIntl();
  const Component = components.Option;
  const hasDraftAndPublish = has(get(props, 'data.value'), 'publishedAt');

  if (hasDraftAndPublish) {
    const isDraft = isEmpty(get(props, 'data.value.publishedAt'));
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
          <Typography ellipsis>{props.label || '-'}</Typography>
        </Flex>
      </Component>
    );
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
