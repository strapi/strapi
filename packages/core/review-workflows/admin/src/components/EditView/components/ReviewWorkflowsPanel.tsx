import * as React from 'react';

import { Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useDoc } from '../../../../../../../admin/src/content-manager/hooks/useDocument';

import { AssigneeSelect } from './AssigneeSelect';
import { StageSelect } from './StageSelect';

import type { PanelComponent } from '../../../../../../../admin/src/core/apis/content-manager';

const ReviewWorkflowsPanel: PanelComponent = () => {
  const { schema } = useDoc();
  const { formatMessage } = useIntl();

  if (!window.strapi.isEE || !schema?.options?.reviewWorkflows) {
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

ReviewWorkflowsPanel.type = 'review-workflows';

export { ReviewWorkflowsPanel };
