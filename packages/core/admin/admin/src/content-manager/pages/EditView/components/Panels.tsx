import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { useStrapiApp } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { DescriptionComponentRenderer } from '../../../../components/DescriptionComponentRenderer';
import { InjectionZone } from '../../../../components/InjectionZone';
import { useDoc } from '../../../hooks/useDocument';

import type {
  ContentManagerPlugin,
  EditViewContext,
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

interface PanelsProps extends Pick<EditViewContext, 'activeTab'> {}

const Panels = ({ activeTab }: PanelsProps) => {
  const { model, id, document, meta } = useDoc();
  const { plugins } = useStrapiApp();

  const props = { activeTab, model, id, document, meta } satisfies PanelComponentProps;

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <DescriptionComponentRenderer
        props={props}
        // @ts-expect-error – TODO: fix TS error
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getEditViewSidePanels()}
      >
        {(descriptions) =>
          descriptions.map(({ content, id, ...description }) => (
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
  const { model } = useDoc();

  return (
    <Flex direction="column" gap={2}>
      {/* <Flex gap={2}></Flex> */}
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
export type { PanelsProps, PanelDescription };
