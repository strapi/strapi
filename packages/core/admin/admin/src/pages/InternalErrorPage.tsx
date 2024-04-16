/**
 * InternalErrorPage
 *
 * This is the page we show when the user gets a 500 error
 *
 */

import { ContentLayout, EmptyStateLayout, HeaderLayout } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { ArrowRight, EmptyPictures } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Page } from '../components/PageHelpers';

export const InternalErrorPage = () => {
  const { formatMessage } = useIntl();

  return (
    <Page.Main labelledBy="title">
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
            // @ts-expect-error We need to accept the props of the component passed in the `as` prop
            <LinkButton forwardedAs={Link} variant="secondary" endIcon={<ArrowRight />} to="/">
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
    </Page.Main>
  );
};
