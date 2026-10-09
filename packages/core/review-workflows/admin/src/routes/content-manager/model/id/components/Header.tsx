import { Flex } from '@strapi/design-system';

import { useIsReviewWorkflowVisible } from '../hooks/useIsReviewWorkflowVisible';

import { AssigneeSelect } from './AssigneeSelect';
import { StageSelect } from './StageSelect';

import type { DocumentActionProps } from '@strapi/content-manager/strapi-admin';

const Header = ({ activeTab }: Pick<DocumentActionProps, 'activeTab'>) => {
  const isReviewWorkflowVisible = useIsReviewWorkflowVisible({
    activeTab,
  });

  if (!isReviewWorkflowVisible) {
    return null;
  }

  return (
    <Flex gap={2}>
      <AssigneeSelect isCompact />
      <StageSelect isCompact />
    </Flex>
  );
};

Header.type = 'preview';

export { Header };
