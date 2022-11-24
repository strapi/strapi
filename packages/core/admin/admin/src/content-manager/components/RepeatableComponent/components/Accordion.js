import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box, Typography, KeyboardNavigable } from '@strapi/design-system';

export const Footer = styled(Box)`
  overflow: hidden;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-left: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
`;

export const Content = styled(Box)`
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-bottom: none;
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  overflow: hidden;

  /* Reset all the border-radius' */
  & > div > div,
  & > div > div > div {
    border-radius: unset;
  }

  & > div:first-child > div,
  & > div:first-child > div > div {
    /* use 1px less to avoid that weird thing where the borders don't align */
    border-radius: ${({ theme }) => `calc(${theme.borderRadius} - 1px)`}
      ${({ theme }) => `calc(${theme.borderRadius} - 1px)`} 0 0;
  }

  /* re-add the border bottom */
  & > div > div {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  }

  & [data-strapi-expanded='true'] {
    border-bottom: 1px solid ${({ theme }) => theme.colors.primary600};
  }
`;

export const Group = ({ children, error }) => {
  const { formatMessage } = useIntl();

  return (
    <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
      {children}
      {error && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600">
            {formatMessage(
              { id: error.id, defaultMessage: error.defaultMessage },
              { ...error.values }
            )}
          </Typography>
        </Box>
      )}
    </KeyboardNavigable>
  );
};

Group.defaultProps = {
  error: undefined,
};

Group.propTypes = {
  children: PropTypes.node.isRequired,
  error: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
};
