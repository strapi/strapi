import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { AssigneeSelect } from './AssigneeSelect';
import { StageSelect } from './StageSelect';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

const Panel: PanelComponent = () => {
  const {
    slug = '',
    id,
    collectionType,
  } = useParams<{
    collectionType: string;
    slug: string;
    id: string;
  }>();

  const {
    edit: { options },
  } = useDocumentLayout(slug);
  const { formatMessage } = useIntl();

  if (
    !window.strapi.isEE ||
    !options?.reviewWorkflows ||
    (collectionType !== 'single-types' && !id) ||
    id === 'create'
  ) {
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
