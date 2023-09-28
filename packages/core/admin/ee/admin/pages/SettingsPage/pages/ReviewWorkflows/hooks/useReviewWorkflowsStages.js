import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export function useReviewWorkflowsStages({ id, layout } = {}, queryOptions = {}) {
  const { kind, uid } = layout;
  const slug = kind === 'collectionType' ? 'collection-types' : 'single-types';

  const { get } = useFetchClient();

  const { data, isLoading, refetch } = useQuery(
    ['content-manager', slug, layout.uid, id, 'stages'],
    async () => {
      const { data } = await get(`/admin/content-manager/${slug}/${uid}/${id}/stages`);

      return data;
    },
    queryOptions
  );

  // these return values need to be memoized, because the default value
  // would lead to infinite rendering loops when used in a dependency array
  // on an effect
  const meta = React.useMemo(() => data?.meta ?? {}, [data?.meta]);
  const stages = React.useMemo(() => data?.data ?? [], [data?.data]);

  return {
    // meta contains e.g. the total of all workflows. we can not use
    // the pagination object here, because the list is not paginated.
    meta,
    stages,
    isLoading,
    refetch,
  };
}
