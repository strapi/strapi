import { Flex } from '@strapi/design-system';
import { unstable_useDocument as useDocument } from '@strapi/plugin-content-manager/strapi-admin';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { AssigneeSelect } from './AssigneeSelect';
import { StageSelect } from './StageSelect';

import type { PanelComponent } from '@strapi/plugin-content-manager/strapi-admin';

const Panel: PanelComponent = () => {
  const {
    collectionType = '',
    slug = '',
    id,
  } = useParams<{
    collectionType: string;
    slug: string;
    id: string;
  }>();

  const { schema } = useDocument({
    collectionType,
    model: slug,
  });
  const { formatMessage } = useIntl();

  if (!window.strapi.isEE || !schema?.options?.reviewWorkflows || !id || id === 'create') {
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

Panel.type = 'review-workflows';

export { Panel };
