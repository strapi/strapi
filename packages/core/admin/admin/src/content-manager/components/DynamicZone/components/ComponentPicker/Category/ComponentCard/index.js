/**
 *
 * ComponentCard
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { pxToRem } from '@strapi/helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)`
  width: ${pxToRem(32)} !important;
  height: ${pxToRem(32)} !important;
  padding: ${pxToRem(9)};
  border-radius: ${pxToRem(64)};
  background: ${({ theme }) => theme.colors.neutral150};
  path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const ComponentBox = styled(Box)`
  flex-shrink: 0;
  height: ${pxToRem(84)};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral100};
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  justify-content: center;
  align-items: center;

  &.active,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${StyledFontAwesomeIcon} {
      background: ${({ theme }) => theme.colors.primary200};
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

function ComponentCard({ componentUid, intlLabel, icon, onClick }) {
  const { formatMessage } = useIntl();
  const handleClick = () => {
    onClick(componentUid);
  };

  return (
    <button type="button" onClick={handleClick}>
      <ComponentBox borderRadius="borderRadius">
        <Stack size={1} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <StyledFontAwesomeIcon icon={icon} />
          <Typography variant="pi" fontWeight="bold" textColor="neutral600">
            {formatMessage(intlLabel)}
          </Typography>
        </Stack>
      </ComponentBox>
    </button>
  );
}

ComponentCard.defaultProps = {
  icon: 'smile',
  onClick: () => {},
};

ComponentCard.propTypes = {
  componentUid: PropTypes.string.isRequired,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
  icon: PropTypes.string,
  onClick: PropTypes.func,
};

export default ComponentCard;
