import * as React from 'react';

import { Box, Popover, Portal, Button } from '@strapi/design-system';
import { FormattedMessage } from 'react-intl';
import { styled } from 'styled-components';

import { useGetGuidedTourMetaQuery } from '../../services/admin';

import {
  type State,
  type Action,
  useGuidedTour,
  ValidTourName,
  ExtendedCompletedActions,
} from './Context';
import { Step, StepCount, createStepComponents } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const GotItAction = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button onClick={onClick}>
      <FormattedMessage id="tours.gotIt" defaultMessage="Got it" />
    </Button>
  );
};

const tours = {
  contentTypeBuilder: createTour('contentTypeBuilder', [
    {
      name: 'Introduction',
      content: (Step) => (
        <Step.Root side="bottom" withArrow={false}>
          <Step.Title
            id="tours.contentTypeBuilder.Introduction.title"
            defaultMessage="Content-Type Builder"
          />
          <Step.Content
            id="tours.contentTypeBuilder.Introduction.content"
            defaultMessage="Create and manage your content structure with collection types, single types and components."
          />
          <Step.Actions showSkip />
        </Step.Root>
      ),
    },
    {
      name: 'CollectionTypes',
      content: (Step) => (
        <Step.Root side="right" sideOffset={16}>
          <Step.Title
            id="tours.contentTypeBuilder.CollectionTypes.title"
            defaultMessage="Collection Types"
          />
          <Step.Content
            id="tours.contentTypeBuilder.CollectionTypes.content"
            defaultMessage="A content structure that can manage multiple entries, such as articles or products."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'SingleTypes',
      content: (Step) => (
        <Step.Root side="right" sideOffset={16}>
          <Step.Title
            id="tours.contentTypeBuilder.SingleTypes.title"
            defaultMessage="Single Types"
          />
          <Step.Content
            id="tours.contentTypeBuilder.SingleTypes.content"
            defaultMessage="A content structure that can manage a single entry, such as a homepage or a header."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'Components',
      content: (Step, { dispatch }) => (
        <Step.Root side="right" sideOffset={16}>
          <Step.Title id="tours.contentTypeBuilder.Components.title" defaultMessage="Components" />
          <Step.Content
            id="tours.contentTypeBuilder.Components.content"
            defaultMessage="A reusable content structure that can be used across multiple content types, such as buttons, sliders or cards."
          />
          <Step.Actions>
            <StepCount tourName="contentTypeBuilder" />
            <GotItAction
              onClick={() => dispatch({ type: 'next_step', payload: 'contentTypeBuilder' })}
            />
          </Step.Actions>
        </Step.Root>
      ),
    },
    {
      name: 'Finish',
      content: (Step) => (
        <Step.Root side="right">
          <Step.Title
            id="tours.contentTypeBuilder.Finish.title"
            defaultMessage="It's time to create content!"
          />
          <Step.Content
            id="tours.contentTypeBuilder.Finish.content"
            defaultMessage="Now that you created content types, you'll be able to create content in the content manager."
          />
          <Step.Actions showStepCount={false} to="/content-manager" />
        </Step.Root>
      ),
      when: (completedActions) => completedActions.includes('didCreateContentTypeSchema'),
    },
  ]),
  contentManager: createTour('contentManager', [
    {
      name: 'Introduction',
      when: (completedActions) => completedActions.includes('didCreateContentTypeSchema'),
      content: (Step) => (
        <Step.Root side="top" withArrow={false}>
          <Step.Title
            id="tours.contentManager.Introduction.title"
            defaultMessage="Content manager"
          />
          <Step.Content
            id="tours.contentManager.Introduction.content"
            defaultMessage="Create and manage content from your collection types and single types."
          />
          <Step.Actions showSkip />
        </Step.Root>
      ),
    },
    {
      name: 'Fields',
      content: (Step) => (
        <Step.Root sideOffset={-12}>
          <Step.Title id="tours.contentManager.Fields.title" defaultMessage="Fields" />
          <Step.Content
            id="tours.contentManager.Fields.content"
            defaultMessage="Add content to the fields created in the Content-Type Builder."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'Publish',
      content: (Step, { dispatch }) => (
        <Step.Root side="left" align="center">
          <Step.Title id="tours.contentManager.Publish.title" defaultMessage="Publish" />
          <Step.Content
            id="tours.contentManager.Publish.content"
            defaultMessage="Publish entries to make their content available through the Document Service API."
          />
          <Step.Actions>
            <StepCount tourName="contentManager" />
            <GotItAction
              onClick={() => dispatch({ type: 'next_step', payload: 'contentManager' })}
            />
          </Step.Actions>
        </Step.Root>
      ),
    },
    {
      name: 'Finish',
      content: (Step) => (
        <Step.Root side="right">
          <Step.Title
            id="tours.contentManager.FinalStep.title"
            defaultMessage="It's time to create API Tokens!"
          />
          <Step.Content
            id="tours.contentManager.FinalStep.content"
            defaultMessage="Now that you've created and published content, time to create API tokens and set up permissions."
          />
          <Step.Actions showStepCount={false} to="/settings/api-tokens" />
        </Step.Root>
      ),
      when: (completedActions) => completedActions.includes('didCreateContent'),
    },
  ]),
  apiTokens: createTour('apiTokens', [
    {
      name: 'Introduction',
      content: (Step) => (
        <Step.Root sideOffset={-36} withArrow={false}>
          <Step.Title id="tours.apiTokens.Introduction.title" defaultMessage="API tokens" />
          <Step.Content
            id="tours.apiTokens.Introduction.content"
            defaultMessage="Create and manage API tokens with highly customizable permissions."
          />
          <Step.Actions showSkip />
        </Step.Root>
      ),
    },
    {
      name: 'CreateAnAPIToken',
      content: (Step) => (
        <Step.Root side="bottom" align="end" sideOffset={-10}>
          <Step.Title
            id="tours.apiTokens.CreateAnAPIToken.title"
            defaultMessage="Create an API token"
          />
          <Step.Content
            id="tours.apiTokens.CreateAnAPIToken.content"
            defaultMessage="Create a new API token. Choose a name, duration and type."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'CopyAPIToken',
      content: (Step, { dispatch }) => (
        <Step.Root side="bottom" align="start" sideOffset={-5}>
          <Step.Title
            id="tours.apiTokens.CopyAPIToken.title"
            defaultMessage="Copy your new API token"
          />
          <Step.Content
            id="tours.apiTokens.CopyAPIToken.content"
            defaultMessage="Make sure to do it now, you won’t be able to see it again. You’ll need to generate a new one if you lose it."
          />
          <Step.Actions>
            <StepCount tourName="apiTokens" />
            <GotItAction onClick={() => dispatch({ type: 'next_step', payload: 'apiTokens' })} />
          </Step.Actions>
        </Step.Root>
      ),
      when: (completedActions) => completedActions.includes('didCreateApiToken'),
    },
    {
      name: 'Finish',
      content: (Step) => (
        <Step.Root side="right" align="start">
          <Step.Title
            id="tours.apiTokens.FinalStep.title"
            defaultMessage="It's time to deploy your application!"
          />
          <Step.Content
            id="tours.apiTokens.FinalStep.content"
            defaultMessage="Your application is ready to be deployed and its content to be shared with the world!"
          />
          <Step.Actions showStepCount={false} to="/" />
        </Step.Root>
      ),
      when: (completedActions) => completedActions.includes('didCopyApiToken'),
    },
  ]),
  strapiCloud: createTour('strapiCloud', []),
} as const;

type Tours = typeof tours;

/* -------------------------------------------------------------------------------------------------
 * GuidedTourTooltip
 * -----------------------------------------------------------------------------------------------*/

type Content = (
  Step: Step,
  {
    state,
    dispatch,
  }: {
    state: State;
    dispatch: React.Dispatch<Action>;
  }
) => React.ReactNode;

type GuidedTourTooltipProps = {
  children: React.ReactNode;
  content: Content;
  tourName: ValidTourName;
  step: number;
  when?: (completedActions: ExtendedCompletedActions) => boolean;
};

const GuidedTourTooltip = ({ children, ...props }: GuidedTourTooltipProps) => {
  const state = useGuidedTour('TooltipWrapper', (s) => s.state);

  if (!state.enabled) {
    return <>{children}</>;
  }

  return <GuidedTourTooltipImpl {...props}>{children}</GuidedTourTooltipImpl>;
};

const GuidedTourOverlay = styled(Box)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(50, 50, 77, 0.2);
  z-index: 10;
`;

const GuidedTourTooltipImpl = ({
  children,
  content,
  tourName,
  step,
  when,
}: GuidedTourTooltipProps) => {
  const { data: guidedTourMeta } = useGetGuidedTourMetaQuery();

  const state = useGuidedTour('GuidedTourTooltip', (s) => s.state);
  const dispatch = useGuidedTour('GuidedTourTooltip', (s) => s.dispatch);

  const isCurrentStep = state.tours[tourName].currentStep === step;
  const isStepConditionMet = when ? when(state.completedActions) : true;
  const isPopoverOpen =
    guidedTourMeta?.data?.isFirstSuperAdminUser &&
    !state.tours[tourName].isCompleted &&
    isCurrentStep &&
    isStepConditionMet;

  // Lock the scroll
  React.useEffect(() => {
    if (!isPopoverOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isPopoverOpen]);

  // TODO: This isn't great but the only solution for syncing the completed actions
  React.useEffect(() => {
    dispatch({
      type: 'set_completed_actions',
      payload: guidedTourMeta?.data?.completedActions ?? [],
    });
  }, [dispatch, guidedTourMeta?.data?.completedActions]);

  const Step = React.useMemo(() => createStepComponents(tourName), [tourName]);

  return (
    <>
      {isPopoverOpen && (
        <Portal>
          <GuidedTourOverlay />
        </Portal>
      )}
      <Popover.Root open={isPopoverOpen}>
        <Popover.Anchor>{children}</Popover.Anchor>
        {content(Step, { state, dispatch })}
      </Popover.Root>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Tour factory
 * -----------------------------------------------------------------------------------------------*/

type TourStep<P extends string> = {
  name: P;
  content: Content;
  when?: (completedActions: ExtendedCompletedActions) => boolean;
};

function createTour<const T extends ReadonlyArray<TourStep<string>>>(tourName: string, steps: T) {
  type Components = {
    [K in T[number]['name']]: React.ComponentType<{ children: React.ReactNode }>;
  };

  const tour = steps.reduce((acc, step, index) => {
    if (step.name in acc) {
      throw Error(`The tour: ${tourName} with step: ${step.name} has already been registered`);
    }

    acc[step.name as keyof Components] = ({ children }: { children: React.ReactNode }) => {
      return (
        <GuidedTourTooltip
          tourName={tourName as ValidTourName}
          step={index}
          content={step.content}
          when={step.when}
        >
          {children}
        </GuidedTourTooltip>
      );
    };

    return acc;
  }, {} as Components);

  return tour;
}

export type { Content, Tours };
export { tours };
