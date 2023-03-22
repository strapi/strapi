import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Flex, Box, Typography } from '@strapi/design-system';
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
    <Flex direction="column" alignItems="stretch" gap={4} paddingBottom={6}>
      {formatMessage(
        { id, defaultMessage },
        {
          documentationLink: DocumentationLink,
          b: Bold,
          p: Paragraph,
          light: Light,
          ul: List,
          li: ListItem,
        }
      )}
    </Flex>
  );
};

const DocumentationLink = (children) => (
  <Typography
    as="a"
    textColor="primary600"
    target="_blank"
    rel="noopener noreferrer"
    href="https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#api-parameters"
  >
    {children}
  </Typography>
);

const Bold = (children) => <Typography fontWeight="semiBold">{children}</Typography>;

const Paragraph = (children) => <Typography>{children}</Typography>;

const Light = (children) => <Typography textColor="neutral600">{children}</Typography>;

const List = (children) => (
  <Box paddingLeft={6}>
    <ul>{children}</ul>
  </Box>
);

const ListItem = (children) => <LiStyled>{children}</LiStyled>;

Content.propTypes = {
  id: PropTypes.string.isRequired,
  defaultMessage: PropTypes.string.isRequired,
};

export default Content;
