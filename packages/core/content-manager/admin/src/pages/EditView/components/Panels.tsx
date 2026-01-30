import * as React from 'react';

import {
  useQueryParams,
  useStrapiApp,
  DescriptionComponentRenderer,
  useIsDesktop,
  createContext,
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
interface PanelsItemsProps {
  panels: (PanelDescription & { id: string })[];
  setVisiblePanels:
    | React.Dispatch<React.SetStateAction<(PanelDescription & { id: string })[]>>
    | null
    | undefined;
  visiblePanelsLength: number | undefined;
}

const PanelsItems = ({ panels, setVisiblePanels, visiblePanelsLength }: PanelsItemsProps) => {
  React.useEffect(() => {
    if (setVisiblePanels && visiblePanelsLength !== panels.length) {
      setVisiblePanels(panels);
    }
  }, [panels, panels.length, setVisiblePanels, visiblePanelsLength]);

  return (
    <>
      {panels.map(({ content, id, ...description }) => (
        <Panel key={id} {...description}>
          {content}
        </Panel>
      ))}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Panels
 * -----------------------------------------------------------------------------------------------*/

const Panels = ({ withActions = true }: { withActions?: boolean }) => {
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
  // Optional context consumer
  const setVisiblePanels = usePanelsContext('Panels', (s) => s.setVisiblePanels, false);
  const visiblePanels = usePanelsContext('Panels', (s) => s.visiblePanels, false);

  const allPanels = (
    plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
  ).getEditViewSidePanels();
  const filteredPanels = allPanels.filter((panel) => (panel as PanelComponent).type !== 'actions');
  const panelsToDisplay = withActions ? allPanels : filteredPanels;

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
      <DescriptionComponentRenderer props={props} descriptions={panelsToDisplay}>
        {(panels) => (
          <PanelsItems
            panels={panels}
            setVisiblePanels={setVisiblePanels}
            visiblePanelsLength={visiblePanels?.length}
          />
        )}
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
      background={{ initial: 'transparent', large: 'neutral0' }}
      borderColor={{ initial: 'transparent', large: 'neutral150' }}
      hasRadius={isDesktop}
      padding={{ initial: 0, large: 4 }}
      shadow={{ initial: 'none', large: 'tableShadow' }}
      gap={{ initial: 4, large: 3 }}
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

/* -------------------------------------------------------------------------------------------------
 * PanelsContext
 * -----------------------------------------------------------------------------------------------*/

const [PanelsProviderImpl, usePanelsContext] = createContext<{
  visiblePanels: (PanelDescription & { id: string })[];
  setVisiblePanels: React.Dispatch<React.SetStateAction<(PanelDescription & { id: string })[]>>;
}>('PanelsContext');

const PanelsProvider = ({ children }: React.PropsWithChildren) => {
  const [visiblePanels, setVisiblePanels] = React.useState<(PanelDescription & { id: string })[]>(
    []
  );

  return (
    <PanelsProviderImpl visiblePanels={visiblePanels} setVisiblePanels={setVisiblePanels}>
      {children}
    </PanelsProviderImpl>
  );
};

export { Panels, ActionsPanel, ActionsPanelContent, PanelsProvider, usePanelsContext };
export type { PanelDescription };
