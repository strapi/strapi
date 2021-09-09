import React from 'react';
import { CustomContentLayout, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { Main } from '@strapi/parts/Main';
import { HeaderLayout } from '@strapi/parts/Layout';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const NoPermissions = () => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main labelledBy="title">
      <HeaderLayout
        id="title"
        title={formatMessage({
          id: getTrad('header.name'),
          defaultMessage: 'Content',
        })}
      />
      <CustomContentLayout canRead={false}>
        <div />
      </CustomContentLayout>
    </Main>
  );
};

export default NoPermissions;
