import React, { lazy, Suspense, useEffect } from 'react';

import { Page, useQueryParams } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';
import { getTrad } from '../../utils';

import { MediaLibrary } from './MediaLibrary';

const ConfigureTheView = lazy(() => import('./ConfigureTheView'));

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

  if (isLoading) {
    return (
      <>
        <Page.Title>{title}</Page.Title>
        <Page.Loading />
      </>
    );
  }

  return (
    <Page.Main>
      {rawQuery ? (
        <Suspense fallback={<Page.Loading />}>
          <Routes>
            <Route index element={<MediaLibrary />} />
            <Route path="configuration" element={<ConfigureTheView config={config} />} />
          </Routes>
        </Suspense>
      ) : null}
    </Page.Main>
  );
};

export default Upload;
