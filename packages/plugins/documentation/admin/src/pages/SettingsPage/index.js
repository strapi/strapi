import React from 'react';
import { useIntl } from 'react-intl';
import { CheckPermissions } from '@strapi/helper-plugin';
import { Layout, HeaderLayout, Main, Button } from '@strapi/parts';
import { Check } from '@strapi/icons';

import permissions from '../../permissions';
import { getTrad } from '../../utils';
import useReactQuery from '../utils/useReactQuery';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { submitMutation, data } = useReactQuery();

  return (
    <Layout>
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('plugin.name'),
            defaultMessage: 'Documentation',
          })}
          subtitle={formatMessage({
            id: getTrad('pages.SettingsPage.header.description'),
            defaultMessage: 'Configure the documentation plugin',
          })}
          primaryAction={
            //  eslint-disable-next-line
            <CheckPermissions permissions={permissions.update}>
              <Button
                onClick={() => submitMutation.mutate({ prefix: data?.prefix, body: {} })}
                startIcon={<Check />}
              >
                {formatMessage({
                  id: getTrad('pages.SettingsPage.Button.save'),
                  defaultMessage: 'Save',
                })}
              </Button>
            </CheckPermissions>
          }
        />
      </Main>
    </Layout>
  );
};

export default SettingsPage;
