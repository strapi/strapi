import React from 'react';
import { useFocusWhenNavigate, NoPermissions as NoPermissionsCompo } from '@strapi/helper-plugin';
import { Main } from '@strapi/parts/Main';
import { ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
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
