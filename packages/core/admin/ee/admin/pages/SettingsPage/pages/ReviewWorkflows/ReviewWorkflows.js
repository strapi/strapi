import React from 'react';
import { useIntl } from 'react-intl';
import { SettingsPageTitle } from '@strapi/helper-plugin';
import { Button, ContentLayout, HeaderLayout, Layout, Main } from '@strapi/design-system';
import { Check } from '@strapi/icons';

import { Stages } from './components/Stages';

const STAGES = [
  {
    uid: 'id-1',
    name: 'To do',
  },

  {
    uid: 'id-2',
    name: 'Ready to review',
  },

  {
    uid: 'id-3',
    name: 'In progress',
  },

  {
    uid: 'id-4',
    name: 'Reviewed',
  },
];

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
            <Button startIcon={<Check />} type="submit" size="L" disabled>
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
            { count: STAGES.length }
          )}
        />
        <ContentLayout>
          <Stages stages={STAGES} />
        </ContentLayout>
      </Main>
    </Layout>
  );
}
