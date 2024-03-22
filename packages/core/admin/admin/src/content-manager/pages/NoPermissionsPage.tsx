import { ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Page } from '../../components/PageHelpers';
import { getTranslation } from '../utils/translations';

const NoPermissions = () => {
  const { formatMessage } = useIntl();

  return (
    <>
      <HeaderLayout
        title={formatMessage({
          id: getTranslation('header.name'),
          defaultMessage: 'Content',
        })}
      />
      <ContentLayout>
        <Page.NoPermissions />
      </ContentLayout>
    </>
  );
};

export { NoPermissions };
