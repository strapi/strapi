import React from 'react';
import { SettingsPageTitle, LoadingIndicatorPage } from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Button } from '@strapi/parts/Button';
import CheckIcon from '@strapi/icons/CheckIcon';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const LoadingView = ({ apiTokenName }) => {
  const { formatMessage } = useIntl();

  return (
    <Main aria-busy="true">
      <SettingsPageTitle name="API Tokens" />
      <HeaderLayout
        primaryAction={
          <Button disabled startIcon={<CheckIcon />} type="button" size="L">
            {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
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

LoadingView.defaultProps = {
  apiTokenName: null,
};

LoadingView.propTypes = {
  apiTokenName: PropTypes.string,
};

export default LoadingView;
