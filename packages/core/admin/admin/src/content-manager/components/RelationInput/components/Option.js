import React from 'react';
import styled from 'styled-components';
import { components } from 'react-select';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

import { pxToRem } from '@strapi/helper-plugin';
import { Flex, Typography } from '@strapi/design-system';
import { getTrad } from '../../../utils';

const StyledBullet = styled.div`
  flex-shrink: 0;
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  margin-right: ${({ theme }) => theme.spaces[2]};
  background-color: ${({ theme, isDraft }) =>
    theme.colors[isDraft ? 'secondary600' : 'success600']};
  border-radius: 50%;
`;

export const Option = (props) => {
  const { formatMessage } = useIntl();
  const Component = components.Option;
  const { publicationState, mainField, id } = props.data;

  if (publicationState) {
    const isDraft = publicationState === 'draft';
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
          <Typography ellipsis>{mainField ?? id}</Typography>
        </Flex>
      </Component>
    );
  }

  return <Component {...props}>{mainField ?? id}</Component>;
};

Option.propTypes = {
  isFocused: PropTypes.bool.isRequired,
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
    isDraft: PropTypes.bool,
    mainField: PropTypes.string,
    publicationState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  }).isRequired,
};
