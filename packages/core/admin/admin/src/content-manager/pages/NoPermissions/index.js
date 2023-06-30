import React from 'react';

import { ContentLayout, HeaderLayout, Main } from '@strapi/design-system';
import { NoPermissions as NoPermissionsCompo, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

const NoPermissions = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main>
      <HeaderLayout
        title={formatMessage({
          id: getTrad('header.name'),
          defaultMessage: 'Content',
        })}
      />
      <ContentLayout>
        <NoPermissionsCompo />
      </ContentLayout>
    </Main>
  );
};

export default NoPermissions;
