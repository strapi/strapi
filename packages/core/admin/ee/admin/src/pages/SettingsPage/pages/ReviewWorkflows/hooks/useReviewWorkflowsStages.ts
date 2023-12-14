import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { UseQueryOptions, useQuery } from 'react-query';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Entity, Schema } from '@strapi/types';

interface UseReviewWorkflowStagesArgs {
  id: Entity.ID;
  layout: Schema.ContentType;
}

export function useReviewWorkflowsStages(
  { id, layout }: UseReviewWorkflowStagesArgs,
  queryOptions: Omit<
    UseQueryOptions<Contracts.ReviewWorkflows.GetStages.Response>,
    'queryKey' | 'queryFn'
  > = {}
) {
  const { kind, uid } = layout;
  const slug = kind === 'collectionType' ? 'collection-types' : 'single-types';

  const { get } = useFetchClient();

  const { data, isLoading, refetch } = useQuery<Contracts.ReviewWorkflows.GetStages.Response>(
    ['content-manager', slug, uid, id, 'stages'],
    async () => {
      const { data } = await get<Contracts.ReviewWorkflows.GetStages.Response>(
        `/admin/content-manager/${slug}/${uid}/${id}/stages`
      );

      return data;
    },
    queryOptions
  );

  // these return values need to be memoized, because the default value
  // would lead to infinite rendering loops when used in a dependency array
  // on an effect
  const meta = React.useMemo(() => data?.meta ?? { workflowCount: 0 }, [data?.meta]);
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
