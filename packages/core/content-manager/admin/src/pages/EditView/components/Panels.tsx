import * as React from 'react';

import {
  useQueryParams,
  useStrapiApp,
  DescriptionComponentRenderer,
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

const Panels = () => {
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

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <DescriptionComponentRenderer
        props={props}
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getEditViewSidePanels()}
      >
        {(panels) =>
          panels.map(({ content, id, ...description }) => (
            <Panel key={id} {...description}>
              {content}
            </Panel>
          ))
        }
      </DescriptionComponentRenderer>
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
        ).getDocumentActions()}
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
  return (
    <Flex
      ref={ref}
      tag="aside"
      aria-labelledby="additional-information"
      background="neutral0"
      borderColor="neutral150"
      hasRadius
      paddingBottom={4}
      paddingLeft={4}
      paddingRight={4}
      paddingTop={4}
      shadow="tableShadow"
      gap={3}
      direction="column"
      justifyContent="stretch"
      alignItems="flex-start"
    >
      <Typography tag="h2" variant="sigma" textTransform="uppercase">
        {title}
      </Typography>
      {children}
    </Flex>
  );
});

export { Panels, ActionsPanel };
export type { PanelDescription };
