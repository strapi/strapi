import React from 'react';
import {
  SettingsPageTitle,
  LoadingIndicatorPage,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { HeaderLayout, ContentLayout, Main, Button } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';

const LoadingView = ({ transferTokenName }) => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main aria-busy="true">
      <SettingsPageTitle name="Transfer Tokens" />
      <HeaderLayout
        primaryAction={
          <Button disabled startIcon={<Check />} type="button" size="L">
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        }
        title={
          transferTokenName ||
          formatMessage({
            id: 'Settings.transferTokens.createPage.title',
            defaultMessage: 'Create Transfer Token',
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
  transferTokenName: null,
};

LoadingView.propTypes = {
  transferTokenName: PropTypes.string,
};

export default LoadingView;
