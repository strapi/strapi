import * as React from 'react';

import { Box, Link } from '@strapi/design-system';

import { type CompletedActions } from '../Context';
import { type StepContentProps } from '../Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';

import { GotItAction, StepCount } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Step Components
 * -----------------------------------------------------------------------------------------------*/

const Introduction = ({ Step }: StepContentProps) => (
  <Step.Root side="top" sideOffset={32} withArrow={false}>
    <Step.Title
      id="tours.apiTokens.Introduction.title"
      defaultMessage="Last but not least, API tokens"
    />
    <Step.Content
      id="tours.apiTokens.Introduction.content"
      defaultMessage="Control API access with highly customizable permissions."
    />
    <Step.Actions showSkip />
  </Step.Root>
);

const ManageAPIToken = ({ Step }: StepContentProps) => (
  <Step.Root side="bottom" align="end">
    <Step.Title id="tours.apiTokens.ManageAPIToken.title" defaultMessage="Manage an API token" />
    <Step.Content
      id="tours.apiTokens.ManageAPIToken.content"
      defaultMessage='Click the "Pencil" icon to view and update an existing API token.'
    />
    <Step.Actions />
  </Step.Root>
);

const ViewAPIToken = ({ Step, dispatch }: StepContentProps) => (
  <Step.Root side="bottom" align="end">
    <Step.Title id="tours.apiTokens.ViewAPIToken.title" defaultMessage="View API token" />
    <Step.Content
      id="tours.apiTokens.ViewAPIToken.content"
      defaultMessage='Click the "View token" button to see your API token.'
    />
    <Step.Actions>
      <StepCount tourName="apiTokens" />
      <GotItAction onClick={() => dispatch({ type: 'next_step', payload: 'apiTokens' })} />
    </Step.Actions>
  </Step.Root>
);

const CopyAPIToken = ({ Step, dispatch }: StepContentProps) => (
  <Step.Root side="bottom" align="start" sideOffset={-5}>
    <Step.Title id="tours.apiTokens.CopyAPIToken.title" defaultMessage="Copy your new API token" />
    <Step.Content
      id="tours.apiTokens.CopyAPIToken.content"
      defaultMessage="Copy your API token"
      values={{
        spacer: <Box paddingTop={2} />,
        a: (msg: React.ReactNode) => (
          <Link isExternal href="https://docs.strapi.io/cms/features/api-tokens#usage">
            {msg}
          </Link>
        ),
      }}
    />
    <Step.Actions>
      <StepCount tourName="apiTokens" />
      <GotItAction onClick={() => dispatch({ type: 'next_step', payload: 'apiTokens' })} />
    </Step.Actions>
  </Step.Root>
);

const Finish = ({ Step }: StepContentProps) => (
  <Step.Root side="right" align="start">
    <Step.Title
      id="tours.apiTokens.FinalStep.title"
      defaultMessage="Congratulations, it's time to deploy your application!"
    />
    <Step.Content
      id="tours.apiTokens.FinalStep.content"
      defaultMessage="Your application is ready to be deployed and its content to be shared with the world!"
    />
    <Step.Actions showPrevious={false} showStepCount={false} to="/" />
  </Step.Root>
);

/* -------------------------------------------------------------------------------------------------
 * Steps
 * -----------------------------------------------------------------------------------------------*/

export const apiTokensSteps = [
  {
    name: 'Introduction',
    content: Introduction,
  },
  {
    name: 'ManageAPIToken',
    content: ManageAPIToken,
  },
  {
    name: 'ViewAPIToken',
    content: ViewAPIToken,
  },
  {
    name: 'CopyAPIToken',
    content: CopyAPIToken,
  },
  {
    name: 'Finish',
    content: Finish,
    excludeFromStepCount: true,
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken),
  },
] as const;
