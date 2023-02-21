/**
 * InternalErrorPage
 *
 * This is the page we show when the user gets a 500 error
 *
 */
import React from 'react';
import { useFocusWhenNavigate, LinkButton } from '@strapi/helper-plugin';
import { Main, ContentLayout, HeaderLayout, EmptyStateLayout } from '@strapi/design-system';
import { EmptyPictures, ArrowRight } from '@strapi/icons';
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
