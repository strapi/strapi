import * as React from 'react';

// @ts-expect-error - No types available
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';

interface SettingsPageTitleProps {
  name: string;
}

const SettingsPageTitle = ({ name }: SettingsPageTitleProps) => {
  const { formatMessage } = useIntl();
  const text = formatMessage(
    { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
    { name }
  );

  return <Helmet title={text} />;
};

export { SettingsPageTitle };
