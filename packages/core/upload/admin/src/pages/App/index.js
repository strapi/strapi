import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useQueryParams } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';
import { MediaLibrary } from './MediaLibrary';

const App = () => {
  const [{ rawQuery }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  useEffect(() => {
    if (!rawQuery) {
      setQuery({ sort: 'updatedAt:DESC', page: 1, pageSize: 10 });
    }
  }, [rawQuery, setQuery]);

  if (rawQuery) {
    return (
      <>
        <Helmet title={title} />
        <MediaLibrary />
      </>
    );
  }

  return null;
};

export default App;
