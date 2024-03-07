import { ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import { useFocusWhenNavigate } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { Page } from '../../components/PageHelpers';
import { getTranslation } from '../utils/translations';

const NoPermissions = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main>
      <HeaderLayout
        title={formatMessage({
          id: getTranslation('header.name'),
          defaultMessage: 'Content',
        })}
      />
      <ContentLayout>
        <Page.NoPermissions />
      </ContentLayout>
    </Main>
  );
};

export { NoPermissions };
