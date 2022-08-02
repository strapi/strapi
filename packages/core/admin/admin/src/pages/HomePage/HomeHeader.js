import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Link } from '@strapi/design-system/v2/Link';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import ArrowRight from '@strapi/icons/ArrowRight';

const WordWrap = styled(Typography)`
  word-break: break-word;
`;

const StackCustom = styled(Stack)`
  align-items: flex-start;
`;

const HomeHeader = ({ hasCreatedContentType, onCreateCT }) => {
  const { formatMessage } = useIntl();

  return (
    <div>
      <Box paddingLeft={6} paddingBottom={10}>
        <StackCustom spacing={5}>
          <Typography as="h1" variant="alpha">
            {hasCreatedContentType
              ? formatMessage({
                  id: 'app.components.HomePage.welcome.again',
                  defaultMessage: 'Welcome 👋',
                })
              : formatMessage({
                  id: 'app.components.HomePage.welcome',
                  defaultMessage: 'Welcome on board!',
                })}
          </Typography>
          <WordWrap textColor="neutral600" variant="epsilon">
            {hasCreatedContentType
              ? formatMessage({
                  id: 'app.components.HomePage.welcomeBlock.content.again',
                  defaultMessage:
                    'We hope you are making progress on your project! Feel free to read the latest news about Strapi. We are giving our best to improve the product based on your feedback.',
                })
              : formatMessage({
                  id: 'app.components.HomePage.welcomeBlock.content',
                  defaultMessage:
                    'Congrats! You are logged as the first administrator. To discover the powerful features provided by Strapi, we recommend you to create your first Content type!',
                })}
          </WordWrap>
          {hasCreatedContentType ? (
            <Link isExternal href="https://strapi.io/blog">
              {formatMessage({
                id: 'app.components.HomePage.button.blog',
                defaultMessage: 'See more on the blog',
              })}
            </Link>
          ) : (
            <Button size="L" onClick={onCreateCT} endIcon={<ArrowRight />}>
              {formatMessage({
                id: 'app.components.HomePage.create',
                defaultMessage: 'Create your first Content type',
              })}
            </Button>
          )}
        </StackCustom>
      </Box>
    </div>
  );
};

HomeHeader.defaultProps = {
  hasCreatedContentType: undefined,
  onCreateCT: undefined,
};

HomeHeader.propTypes = {
  hasCreatedContentType: PropTypes.bool,
  onCreateCT: PropTypes.func,
};

export default HomeHeader;
