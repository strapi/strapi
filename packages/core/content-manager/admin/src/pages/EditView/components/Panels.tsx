import * as React from 'react';

import {
  useQueryParams,
  useStrapiApp,
  DescriptionComponentRenderer,
  useIsDesktop,
} from '@strapi/admin/strapi-admin';
import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useMatch } from 'react-router-dom';

import { InjectionZone } from '../../../components/InjectionZone';
import { useDoc } from '../../../hooks/useDocument';
import { CLONE_PATH } from '../../../router';

import { DocumentActions } from './DocumentActions';

import type {
  ContentManagerPlugin,
  DocumentActionProps,
  PanelComponent,
  PanelComponentProps,
} from '../../../content-manager';

interface PanelDescription {
  title: string;
  content: React.ReactNode;
}

/* -------------------------------------------------------------------------------------------------
 * Panels
 * -----------------------------------------------------------------------------------------------*/

interface PanelsProps {
  excludeActionsPanel?: boolean;
  onContentChange?: (hasContent: boolean) => void;
}

const Panels = ({ excludeActionsPanel = false, onContentChange }: PanelsProps = {}) => {
  const isCloning = useMatch(CLONE_PATH) !== null;
  const [
    {
      query: { status },
    },
  ] = useQueryParams<{ status: 'draft' | 'published' }>({
    status: 'draft',
  });
  const { model, id, document, meta, collectionType } = useDoc();
  const plugins = useStrapiApp('Panels', (state) => state.plugins);
  const props = {
    activeTab: status,
    model,
    documentId: id,
    document: isCloning ? undefined : document,
    meta: isCloning ? undefined : meta,
    collectionType,
  } satisfies PanelComponentProps;

  const allPanels = (
    plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
  ).getEditViewSidePanels();

  const filteredPanels = excludeActionsPanel
    ? allPanels.filter((panel) => (panel as PanelComponent).type !== 'actions')
    : allPanels;

  return (
    <DescriptionComponentRenderer props={props} descriptions={filteredPanels}>
      {(panels) => <PanelsItems panels={panels} onHasContentChange={onContentChange} />}
    </DescriptionComponentRenderer>
  );
};

const PanelsItems = ({
  panels,
  onHasContentChange,
}: {
  panels: (PanelDescription & { id: string })[];
  onHasContentChange?: (hasContent: boolean) => void;
}) => {
  const isDesktop = useIsDesktop();
  const hasContent = panels.length > 0;

  React.useEffect(() => {
    onHasContentChange?.(hasContent);
  }, [hasContent, onHasContentChange]);

  if (!hasContent) {
    return null;
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={isDesktop ? 2 : 4}>
      {panels.map(({ content, id, ...description }) => (
        <Panel key={id} {...description}>
          {content}
        </Panel>
      ))}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Default Action Panels (CE)
 * -----------------------------------------------------------------------------------------------*/

const ActionsPanel: PanelComponent = () => {
  const { formatMessage } = useIntl();

  return {
    title: formatMessage({
      id: 'content-manager.containers.edit.panels.default.title',
      defaultMessage: 'Entry',
    }),
    content: <ActionsPanelContent />,
  };
};

ActionsPanel.type = 'actions';

const ActionsPanelContent = () => {
  const isCloning = useMatch(CLONE_PATH) !== null;
  const [
    {
      query: { status = 'draft' },
    },
  ] = useQueryParams<{ status: 'draft' | 'published' }>();
  const { model, id, document, meta, collectionType } = useDoc();
  const plugins = useStrapiApp('ActionsPanel', (state) => state.plugins);

  const props = {
    activeTab: status,
    model,
    documentId: id,
    document: isCloning ? undefined : document,
    meta: isCloning ? undefined : meta,
    collectionType,
  } satisfies DocumentActionProps;

  return (
    <Flex direction="column" gap={2} width="100%">
      <DescriptionComponentRenderer
        props={props}
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getDocumentActions('panel')}
      >
        {(actions) => <DocumentActions actions={actions} />}
      </DescriptionComponentRenderer>
      <InjectionZone area="editView.right-links" slug={model} />
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Panel
 * -----------------------------------------------------------------------------------------------*/

interface PanelProps extends Pick<PanelDescription, 'title'> {
  children: React.ReactNode;
}

const Panel = React.forwardRef<any, PanelProps>(({ children, title }, ref) => {
  const isDesktop = useIsDesktop();
  return (
    <Flex
      ref={ref}
      tag="aside"
      aria-labelledby="additional-information"
      background={isDesktop ? 'neutral0' : 'transparent'}
      borderColor={isDesktop ? 'neutral150' : 'transparent'}
      hasRadius={isDesktop}
      padding={isDesktop ? 4 : 0}
      shadow={isDesktop ? 'tableShadow' : 'none'}
      gap={isDesktop ? 3 : 4}
      direction="column"
      justifyContent="stretch"
      alignItems="flex-start"
    >
      <Typography tag="h2" variant="sigma" textTransform="uppercase" textColor="neutral600">
        {title}
      </Typography>
      {children}
    </Flex>
  );
});

export { Panels, ActionsPanel, ActionsPanelContent };
export type { PanelDescription };
