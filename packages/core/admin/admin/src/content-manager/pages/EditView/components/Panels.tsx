import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { DescriptionComponentRenderer } from '../../../../components/DescriptionComponentRenderer';
import { InjectionZone } from '../../../../components/InjectionZone';
import { useDoc } from '../../../hooks/useDocument';

import { DocumentActions } from './DocumentActions';

import type {
  ContentManagerPlugin,
  DocumentActionProps,
  PanelComponent,
  PanelComponentProps,
} from '../../../../core/apis/content-manager';

interface PanelDescription {
  title: string;
  content: React.ReactNode;
}

/* -------------------------------------------------------------------------------------------------
 * Panels
 * -----------------------------------------------------------------------------------------------*/

const Panels = () => {
  const [
    {
      query: { status = 'draft' },
    },
  ] = useQueryParams<{ status: 'draft' | 'published' }>();
  const { model, id, document, meta } = useDoc();
  const { plugins } = useStrapiApp();

  const props = { activeTab: status, model, id, document, meta } satisfies PanelComponentProps;

  const descriptions = React.useMemo(
    () =>
      (
        plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
      ).getEditViewSidePanels(),
    []
  );

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <DescriptionComponentRenderer props={props} descriptions={descriptions}>
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
  const [
    {
      query: { status = 'draft' },
    },
  ] = useQueryParams<{ status: 'draft' | 'published' }>();
  const { model, id, document, meta } = useDoc();
  const { plugins } = useStrapiApp();

  const props = { activeTab: status, model, id, document, meta } satisfies DocumentActionProps;

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
      <InjectionZone area="contentManager.editView.right-links" slug={model} />
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
      as="aside"
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
      <Typography variant="sigma" textTransform="uppercase">
        {title}
      </Typography>
      {children}
    </Flex>
  );
});

export { Panels, ActionsPanel };
export type { PanelDescription };
