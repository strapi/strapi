import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Status, Typography } from '@strapi/design-system';

import { getTrad } from '../../../utils';

const StyledStatus = styled(Status)`
  width: min-content;
`;

export function PublicationState({ isPublished }) {
  const { formatMessage } = useIntl();
  const variant = isPublished ? 'success' : 'secondary';

  return (
    <StyledStatus showBullet={false} variant={variant} size="S">
      <Typography fontWeight="bold" textColor={`${variant}700`}>
        {formatMessage({
          id: getTrad(`containers.List.${isPublished ? 'published' : 'draft'}`),
          defaultMessage: isPublished ? 'Published' : 'Draft',
        })}
      </Typography>
    </StyledStatus>
  );
}

PublicationState.propTypes = {
  isPublished: PropTypes.bool.isRequired,
};
