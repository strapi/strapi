import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Subtitle, H1 } from '@strapi/parts/Text';
import { Link } from '@strapi/parts/Link';
import { Stack } from '@strapi/parts/Stack';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import NextIcon from '@strapi/icons/NextIcon';

const HomeHeader = ({ hasCreatedContentType, onCreateCT }) => {
  const { formatMessage } = useIntl();

  return (
    <Box paddingLeft={6} paddingBottom={10}>
      <Stack size={5} alignItems="flex-start">
        <H1>
          {hasCreatedContentType
            ? formatMessage({
                id: 'app.components.HomePage.welcome.again',
                defaultMessage: 'Welcome 👋',
              })
            : formatMessage({
                id: 'app.components.HomePage.welcome',
                defaultMessage: 'Welcome on board!',
              })}
        </H1>
        <Subtitle textColor="neutral600">
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
        </Subtitle>
        {hasCreatedContentType ? (
          <Link href="https://strapi.io/blog">
            {formatMessage({
              id: 'app.components.HomePage.button.blog',
              defaultMessage: 'See more on the blog',
            })}
          </Link>
        ) : (
          <Button size="L" onClick={onCreateCT} endIcon={<NextIcon />}>
            {formatMessage({
              id: 'app.components.HomePage.create',
              defaultMessage: 'Create your first Content type',
            })}
          </Button>
        )}
      </Stack>
    </Box>
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
