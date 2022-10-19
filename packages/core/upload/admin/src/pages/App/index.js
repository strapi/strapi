import React, { useEffect, Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';

import MediaLibrary from './MediaLibrary/MediaLibrary';
import Configure from './Configure';
import { getTrad } from '../../utils';
import pluginID from '../../pluginId';
import { useConfig } from '../../hooks/useConfig';

const App = () => {
  const {
    get: { isLoading, isError, data: configData, error },
  } = useConfig();

  const [{ rawQuery }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  useEffect(() => {
    if (isLoading || isError || rawQuery) return;
    setQuery({ sort: 'updatedAt:DESC', page: 1, pageSize: configData.data.pageSize });
  }, [isLoading, isError, configData, error, rawQuery, setQuery]);

  if (rawQuery) {
    return (
      <>
        <Helmet title={title} />
        <Suspense fallback={<LoadingIndicatorPage />}>
          <Switch>
            <Route exact path={`/plugins/${pluginID}`} component={MediaLibrary} />
            <Route
              exact
              path={`/plugins/${pluginID}/configuration`}
              render={() => <Configure configData={configData} />}
            />
          </Switch>
        </Suspense>
      </>
    );
  }

  return null;
};

export default App;
