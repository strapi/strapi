import React from 'react';
import { useFocusWhenNavigate } from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';
import AddIcon from '@strapi/icons/AddIcon';
import EmptyStateDocument from '@strapi/icons/EmptyStateDocument';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const NoContentType = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main>
      <HeaderLayout
        title={formatMessage({
          id: getTrad('header.name'),
          defaultMessage: 'Content',
        })}
      />
      <ContentLayout>
        <EmptyStateLayout
          action={
            <LinkButton
              variant="secondary"
              startIcon={<AddIcon />}
              to="/plugins/content-type-builder/content-types/create-content-type"
            >
              {formatMessage({
                id: 'app.components.HomePage.create',
                defaultMessage: 'Create your first Content-type',
              })}
            </LinkButton>
          }
          content={formatMessage({
            id: 'content-manager.pages.NoContentType.text',
            defaultMessage:
              "You don't have any content yet, we recommend you to create your first Content-Type.",
          })}
          hasRadius
          icon={<EmptyStateDocument width="10rem" />}
          shadow="tableShadow"
        />
      </ContentLayout>
    </Main>
  );
};

export default NoContentType;
