import React, { useEffect, Suspense, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import { LoadingIndicatorPage, useQueryParams, useFocusWhenNavigate } from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';

import { MediaLibrary } from './MediaLibrary';
import { getTrad } from '../../utils';
import pluginID from '../../pluginId';
import { useConfig } from '../../hooks/useConfig';

const ConfigureTheView = lazy(() =>
  import(/* webpackChunkName: "Upload_ConfigureTheView" */ './ConfigureTheView')
);

const Upload = () => {
  const {
    config: { isLoading, isError, data: config },
  } = useConfig();

  const [{ rawQuery }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  useEffect(() => {
    if (isLoading || isError || rawQuery) {
      return;
    }
    setQuery({ sort: config.sort, page: 1, pageSize: config.pageSize });
  }, [isLoading, isError, config, rawQuery, setQuery]);

  useFocusWhenNavigate();

  return (
    <Main aria-busy={isLoading}>
      <Helmet title={title} />
      {isLoading && <LoadingIndicatorPage />}
      {rawQuery ? (
        <Suspense fallback={<LoadingIndicatorPage />}>
          <Switch>
            <Route exact path={`/plugins/${pluginID}`} component={MediaLibrary} />
            <Route
              exact
              path={`/plugins/${pluginID}/configuration`}
              render={() => <ConfigureTheView config={config} />}
            />
          </Switch>
        </Suspense>
      ) : null}
    </Main>
  );
};

export default Upload;
