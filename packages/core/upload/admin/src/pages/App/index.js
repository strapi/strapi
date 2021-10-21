import React, { useEffect } from 'react';
import { useQueryParams } from '@strapi/helper-plugin';
import { MediaLibrary } from './MediaLibrary';

const App = () => {
  const [{ rawQuery }, setQuery] = useQueryParams();

  useEffect(() => {
    if (!rawQuery) {
      setQuery({ sort: 'updatedAt:DESC', page: 1, pageSize: 10 });
    }
  }, [rawQuery, setQuery]);

  return rawQuery ? <MediaLibrary /> : null;
};

export default App;
