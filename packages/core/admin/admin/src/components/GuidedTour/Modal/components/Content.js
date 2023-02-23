import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Stack, Box, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

const LiStyled = styled.li`
  list-style: disc;
  &::marker {
    color: ${({ theme }) => theme.colors.neutral800};
  }
`;

const Content = ({ id, defaultMessage }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack spacing={4} paddingBottom={6}>
      {formatMessage(
        { id, defaultMessage },
        {
          documentationLink: (children) => (
            <Typography
              as="a"
              textColor="primary600"
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#api-parameters"
            >
              {children}
            </Typography>
          ),
          b: (children) => <Typography fontWeight="semiBold">{children}</Typography>,
          p: (children) => <Typography>{children}</Typography>,
          light: (children) => <Typography textColor="neutral600">{children}</Typography>,
          ul: (children) => (
            <Box paddingLeft={6}>
              <ul>{children}</ul>
            </Box>
          ),
          li: (children) => <LiStyled>{children}</LiStyled>,
        }
      )}
    </Stack>
  );
};

Content.propTypes = {
  id: PropTypes.string.isRequired,
  defaultMessage: PropTypes.string.isRequired,
};

export default Content;
