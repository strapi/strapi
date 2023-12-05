import { ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import {
  NoPermissions as NoPermissionsComponent,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

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
        <NoPermissionsComponent />
      </ContentLayout>
    </Main>
  );
};

export { NoPermissions };
