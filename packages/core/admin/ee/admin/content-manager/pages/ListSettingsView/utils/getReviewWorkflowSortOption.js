export default function getReviewWorkflowSortOption({ formatMessage }) {
  return {
    value: 'strapi_reviewWorkflows_stage[name]',
    label: formatMessage({
      id: 'content-manager.containers.SettingPage.defaultSortOrder.reviewWorkflows',
      message: 'Review Stage',
    }),
  };
}
