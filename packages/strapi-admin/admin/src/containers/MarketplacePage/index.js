import React, { useEffect, useRef } from 'react';
import { LoadingIndicatorPage, useGlobalContext, request } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { useHistory } from 'react-router-dom';

import { useFetchPluginsFromMarketPlace } from '../../hooks';
import PageTitle from '../../components/PageTitle';
import PluginCard from './PluginCard';
import Wrapper from './Wrapper';
import MarketplaceBanner from './MarketplaceBanner';

const MarketPlacePage = () => {
  const history = useHistory();
  const { autoReload, emitEvent, currentEnvironment, formatMessage, plugins } = useGlobalContext();
  const { error, isLoading, data } = useFetchPluginsFromMarketPlace();
  const emitEventRef = useRef(emitEvent);

  useEffect(() => {
    emitEventRef.current('didGoToMarketplace');
  }, []);

  if (isLoading || error) {
    return <LoadingIndicatorPage />;
  }

  const handleDownloadPlugin = async pluginId => {
    emitEvent('willInstallPlugin', { plugin: pluginId });

    // Force the Overlayblocker to be displayed
    const overlayblockerParams = {
      enabled: true,
      title: 'app.components.InstallPluginPage.Download.title',
      description: 'app.components.InstallPluginPage.Download.description',
    };

    // Lock the app
    strapi.lockApp(overlayblockerParams);

    try {
      const opts = {
        method: 'POST',
        body: {
          plugin: pluginId,
          port: window.location.port,
        },
      };
      const response = await request('/admin/plugins/install', opts, overlayblockerParams);

      if (response.ok) {
        emitEvent('didInstallPlugin', { plugin: pluginId });
        // Reload the app
        window.location.reload();
      }
    } catch (err) {
      strapi.unlockApp();
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  };

  return (
    <div>
      <PageTitle
        title={formatMessage({
          id: 'app.components.InstallPluginPage.helmet',
        })}
      />
      <Wrapper>
        <Header
          title={{
            label: formatMessage({
              id: 'app.components.InstallPluginPage.title',
            }),
          }}
          content={formatMessage({
            id: 'app.components.InstallPluginPage.description',
          })}
        />
        <MarketplaceBanner />
        <div className="row" style={{ paddingTop: '4.1rem' }}>
          {data.map(plugin => {
            return (
              <PluginCard
                autoReload={autoReload}
                currentEnvironment={currentEnvironment}
                downloadPlugin={handleDownloadPlugin}
                key={plugin.id}
                history={history}
                plugin={plugin}
                showSupportUsButton={false}
                isAlreadyInstalled={plugins[plugin.id] !== undefined}
              />
            );
          })}
        </div>
      </Wrapper>
    </div>
  );
};

export default MarketPlacePage;
