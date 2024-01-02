import {
  GetWorkflowsParams,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useGetWorkflowsQuery,
  useUpdateWorkflowMutation,
} from '../../../../../services/reviewWorkflows';

export function useReviewWorkflows(params: GetWorkflowsParams = {}) {
  const { id = '', ...queryParams } = params;

  const { data, isLoading } = useGetWorkflowsQuery({
    id,
    populate: 'stages',
    ...queryParams,
  });

  const [createWorkflow] = useCreateWorkflowMutation();
  const [updateWorkflow] = useUpdateWorkflowMutation();
  const [deleteWorkflow] = useDeleteWorkflowMutation();

  const { workflows, meta } = data ?? {};

  return {
    // meta contains e.g. the total of all workflows. we can not use
    // the pagination object here, because the list is not paginated.
    meta,
    workflows,
    isLoading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
  };
}
