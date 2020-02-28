/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { LoadingIndicatorPage, useGlobalContext } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import PageTitle from '../../components/PageTitle';
import useFetchPluginsFromMarketPlace from '../../hooks/useFetchPluginsFromMarketPlace';
import ContainerFluid from '../../components/ContainerFluid';
// import ListPlugins from '../../components/ListPlugins';
import ListWrapper from './ListWrapper';

const InstalledPluginsPage = ({ history }) => {
  const { formatMessage, plugins } = useGlobalContext();
  console.log(plugins);
  const { error, isLoading, data } = useFetchPluginsFromMarketPlace();

  if (isLoading || error) {
    return <LoadingIndicatorPage />;
  }

  return (
    <div>
      <PageTitle
        title={formatMessage({
          id: 'app.components.ListPluginsPage.helmet.title',
        })}
      />
      <ContainerFluid>
        <Header
          title={{
            label: formatMessage({
              id: 'app.components.ListPluginsPage.title',
            }),
          }}
          content={formatMessage({
            id: 'app.components.ListPluginsPage.description',
          })}
          actions={[]}
        />
      </ContainerFluid>
    </div>
  );
};

export default InstalledPluginsPage;
