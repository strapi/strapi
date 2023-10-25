import * as React from 'react';

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
