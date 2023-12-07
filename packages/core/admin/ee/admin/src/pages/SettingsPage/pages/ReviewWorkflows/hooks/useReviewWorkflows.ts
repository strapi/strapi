import * as React from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

import { GetAll, Get } from '../../../../../../../../shared/contracts/review-workflows';

export type APIReviewWorkflowsQueryParams = Get.Params | (GetAll.Request['query'] & { id?: never });

export function useReviewWorkflows(params: APIReviewWorkflowsQueryParams = {}) {
  const { get } = useFetchClient();

  const { id = '', ...queryParams } = params;
  const defaultQueryParams = {
    populate: 'stages',
  };

  const { data, isLoading, status, refetch } = useQuery(
    ['review-workflows', 'workflows', id],
    async () => {
      const { data } = await get<GetAll.Response | Get.Response>(
        `/admin/review-workflows/workflows/${id}`,
        {
          params: { ...defaultQueryParams, ...queryParams },
        }
      );

      return data;
    }
  );

  // the return value needs to be memoized, because intantiating
  // an empty array as default value would lead to an unstable return
  // value, which later on triggers infinite loops if used in the
  // dependency arrays of other hooks
  const workflows = React.useMemo(() => {
    let workflows: GetAll.Response['data'] = [];

    if (data?.data) {
      if (Array.isArray(data.data)) {
        workflows = data.data;
      } else {
        workflows = [data.data];
      }
    }

    return workflows;
  }, [data]);

  const meta = React.useMemo(() => {
    let meta: GetAll.Response['meta'];

    if (data && 'meta' in data) {
      meta = data.meta;
    }

    return meta;
  }, [data]);

  return {
    // meta contains e.g. the total of all workflows. we can not use
    // the pagination object here, because the list is not paginated.
    meta,
    workflows,
    isLoading,
    status,
    refetch,
  };
}
