/**
 *
 * NotFound
 *
 */

// import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import { LinkButton } from '@strapi/parts/LinkButton';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Box } from '@strapi/parts/Box';
import { NoContent } from '../NoContent';

const NotFound = () => {
  const { formatMessage } = useIntl();

  return (
    <Box background="neutral100">
      <Layout>
        <Main>
          <HeaderLayout title="404" />
          <ContentLayout>
            <NoContent
              action={
                <LinkButton to="/" variant="secondary">
                  {formatMessage({
                    id: 'app.components.NotFoundPage.back',
                    defaultMessage: 'Back to the homepage',
                  })}
                </LinkButton>
              }
              content={{
                id: 'app.components.NotFound.description',
                defaultMessage: 'The page you are looking does not exist',
              }}
            />
          </ContentLayout>
        </Main>
      </Layout>
    </Box>
  );
};

NotFound.propTypes = {};

export { NotFound };
