import { Button, ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import { LoadingIndicatorPage, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';

interface LoadingViewProps {
  apiTokenName?: string | null;
}

export const LoadingView = ({ apiTokenName = null }: LoadingViewProps) => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main aria-busy="true">
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'API Tokens' }
        )}
      />
      <HeaderLayout
        primaryAction={
          <Button disabled startIcon={<Check />} type="button" size="L">
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        }
        title={
          apiTokenName ||
          formatMessage({
            id: 'Settings.apiTokens.createPage.title',
            defaultMessage: 'Create API Token',
          })
        }
      />
      <ContentLayout>
        <LoadingIndicatorPage />
      </ContentLayout>
    </Main>
  );
};
