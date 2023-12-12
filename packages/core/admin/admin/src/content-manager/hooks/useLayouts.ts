import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { useQuery } from 'react-query';

import { useTypedSelector } from '../../core/store/hooks';
import { selectSchemas } from '../pages/App';
import { formatLayouts } from '../utils/layouts';

const useContentTypeLayout = (contentTypeUID: string) => {
  const schemas = useTypedSelector(selectSchemas);
  const { get } = useFetchClient();

  const { data, isLoading, refetch } = useQuery(
    ['content-manager', 'content-types', contentTypeUID, 'configuration'],
    async () => {
      const {
        data: { data },
      } = await get<Contracts.ContentTypes.FindContentTypeConfiguration.Response>(
        `/content-manager/content-types/${contentTypeUID}/configuration`
      );

      return data;
    }
  );

  const layout = React.useMemo(() => (data ? formatLayouts(data, schemas) : null), [data, schemas]);

  return {
    isLoading,
    layout,
    updateLayout: refetch,
  };
};

export { useContentTypeLayout };
