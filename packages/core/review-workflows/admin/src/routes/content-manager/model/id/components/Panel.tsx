import { Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useIsReviewWorkflowVisible } from '../hooks/useIsReviewWorkflowVisible';

import { AssigneeSelect } from './AssigneeSelect';
import { StageSelect } from './StageSelect';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

const Panel: PanelComponent = ({ activeTab }) => {
  const isReviewWorkflowVisible = useIsReviewWorkflowVisible({
    activeTab,
  });
  const { formatMessage } = useIntl();

  if (!isReviewWorkflowVisible) {
    return null;
  }

  return {
    title: formatMessage({
      id: 'content-manager.containers.edit.panels.review-workflows.title',
      defaultMessage: 'Review Workflows',
    }),
    content: (
      <Flex direction="column" gap={2} alignItems="stretch" width="100%">
        <AssigneeSelect />
        <StageSelect />
      </Flex>
    ),
  };
};

// @ts-expect-error – this is fine, we like to label the core panels / actions.
Panel.type = 'review-workflows';

export { Panel };
