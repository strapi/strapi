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
  border-bottom: none;

  /* add the borders and make sure the top is transparent to avoid jumping with the hover effect  */
  & > div > div {
    border: 1px solid ${({ theme }) => theme.colors.neutral200};
    border-top-color: transparent;
  }

  /* the top accordion _does_ need a border though */
  & > div:first-child > div {
    border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
  }

  /* Reset all the border-radius' */
  & > div > div,
  & > div > div > div {
    border-radius: unset;
  }

  /* Give the border radius back to the first accordion */
  & > div:first-child > div,
  & > div:first-child > div > div {
    border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  }

  & > div > div[data-strapi-expanded='true'] {
    border: 1px solid ${({ theme }) => theme.colors.primary600};
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
