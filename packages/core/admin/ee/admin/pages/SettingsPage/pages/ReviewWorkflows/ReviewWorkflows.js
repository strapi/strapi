import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from '@strapi/helper-plugin';
import { Button, ContentLayout, HeaderLayout, Layout, Main } from '@strapi/design-system';
import { Check } from '@strapi/icons';

export function ReviewWorkflowsPage() {
  const { formatMessage } = useIntl();

  return (
    <Layout>
      <SettingsPageTitle
        name={formatMessage({
          id: 'Settings.review-workflows.page.title',
          defaultMessage: 'Review Workflow',
        })}
      />
      <Main tabIndex={-1}>
        <HeaderLayout
          primaryAction={
            <Button startIcon={<Check />} type="submit" size="L">
              {formatMessage({
                id: 'global.save',
                defaultMessage: 'Save',
              })}
            </Button>
          }
          title={formatMessage({
            id: 'Settings.review-workflows.page.title',
            defaultMessage: 'Review Workflow',
          })}
          subtitle={formatMessage(
            {
              id: 'Settings.review-workflows.page.subtitle',
              defaultMessage: '{count, plural, one {# stage} other {# stages}}',
            },
            { count: 0 }
          )}
        />
        <ContentLayout />
      </Main>
    </Layout>
  );
}
