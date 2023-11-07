import * as React from 'react';

import { HeaderLayout, Link } from '@strapi/design-system';
import { ArrowLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';

const Release = () => {
  const { formatMessage } = useIntl();
  // TODO: get the title from the API
  const title = 'Release title';

  const totalEntries = 0; // TODO: replace it with the total number of entries
  return (
    <HeaderLayout
      title={title}
      subtitle={formatMessage(
        {
          id: 'content-releases.pages.Details.header-subtitle',
          defaultMessage: '{number, plural, =0 {No entries} one {# entry} other {# entries}}',
        },
        { number: totalEntries }
      )}
      navigationAction={
        <Link startIcon={<ArrowLeft />} to="/plugins/content-releases">
          {formatMessage({
            id: 'global.back',
            defaultMessage: 'Back',
          })}
        </Link>
      }
    />
  );
};

export { Release };
