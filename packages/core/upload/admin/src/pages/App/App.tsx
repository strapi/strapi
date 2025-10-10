// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { Page, useQueryParams } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';
import { getTrad } from '../../utils';

import { MediaLibrary } from './MediaLibrary/MediaLibrary';

import type { Configuration } from '../../../../shared/contracts/configuration';

const ConfigureTheView = React.lazy(async () =>
  import('./ConfigureTheView/ConfigureTheView').then((mod) => ({ default: mod.ConfigureTheView }))
);

export const Upload = () => {
  const {
    config: { isLoading, isError, data: config },
  } = useConfig() as { config: { isLoading: boolean; isError: boolean; data: Configuration } };

  const [{ rawQuery }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  React.useEffect(() => {
    if (isLoading || isError || rawQuery) {
      return;
    }
    setQuery({
      sort: config.sort,
      page: 1,
      pageSize: config.pageSize,
    });
  }, [isLoading, isError, config, rawQuery, setQuery]);

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>
      {rawQuery ? (
        <React.Suspense fallback={<Page.Loading />}>
          <Routes>
            <Route index element={<MediaLibrary />} />
            <Route
              path="configuration"
              element={<ConfigureTheView config={config as Configuration} />}
            />
          </Routes>
        </React.Suspense>
      ) : null}
    </Page.Main>
  );
};
