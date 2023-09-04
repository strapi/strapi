/**
 * InternalErrorPage
 *
 * This is the page we show when the user gets a 500 error
 *
 */
import React from 'react';

import { ContentLayout, EmptyStateLayout, HeaderLayout, Main } from '@strapi/design-system';
import { LinkButton, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { ArrowRight, EmptyPictures } from '@strapi/icons';
import { useIntl } from 'react-intl';

const InternalErrorPage = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main labelledBy="title">
      <HeaderLayout
        id="title"
        title={formatMessage({
          id: 'content-manager.pageNotFound',
          defaultMessage: 'Page not found',
        })}
      />
      <ContentLayout>
        <EmptyStateLayout
          action={
            <LinkButton variant="secondary" endIcon={<ArrowRight />} to="/">
              {formatMessage({
                id: 'app.components.NotFoundPage.back',
                defaultMessage: 'Back to homepage',
              })}
            </LinkButton>
          }
          content={formatMessage({
            id: 'notification.error',
            defaultMessage: 'An error occured',
          })}
          hasRadius
          icon={<EmptyPictures width="10rem" />}
          shadow="tableShadow"
        />
      </ContentLayout>
    </Main>
  );
};

export default InternalErrorPage;
