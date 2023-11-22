import { Button, ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import {
  LoadingIndicatorPage,
  SettingsPageTitle,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface LoadingViewProps {
  apiTokenName?: string | null;
}

export const LoadingView = ({ apiTokenName = null }: LoadingViewProps) => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main aria-busy="true">
      <SettingsPageTitle name="API Tokens" />
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
