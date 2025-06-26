import * as React from 'react';

import { Box, Popover, Flex, Button } from '@strapi/design-system';
import { FormattedMessage } from 'react-intl';
import { styled } from 'styled-components';

import { type State, type Action, unstableUseGuidedTour, ValidTourName } from './Context';
import { Step, createStepComponents } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const tours = {
  contentManager: createTour('contentManager', [
    {
      name: 'Introduction',
      content: (Step) => (
        <Step.Root sideOffset={-36}>
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
  ]),
  apiTokens: createTour('apiTokens', [
    {
      name: 'Introduction',
      content: (Step) => (
        <Step.Root sideOffset={-36}>
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
        <Step.Root side={'bottom'} align="end" sideOffset={20}>
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
      content: (Step) => (
        <Step.Root side="bottom" align="start" sideOffset={-10}>
          <Step.Title
            id="tours.apiTokens.CopyAPIToken.title"
            defaultMessage="Copy your new API token"
          />
          <Step.Content
            id="tours.apiTokens.CopyAPIToken.content"
            defaultMessage="Make sure to do it now, you won’t be able to see it again. You’ll need to generate a new one if you lose it."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'FinalStep',
      content: (Step) => {
        const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);
        return (
          <Step.Root side="bottom" align="start" sideOffset={-10}>
            <Step.Title
              id="tours.apiTokens.FinalStep.title"
              defaultMessage="It’s time to deploy your application!"
            />
            <Step.Content
              id="tours.apiTokens.FinalStep.content"
              defaultMessage="Your application is ready to be deployed and its content to be shared with the world!"
            />
            <Step.Actions showStepCount={false}>
              <Flex>
                <Button
                  onClick={() => {
                    dispatch({ type: 'next_step', payload: 'apiTokens' });
                  }}
                >
                  <FormattedMessage id="tours.gotIt" defaultMessage="Got it" />
                </Button>
              </Flex>
            </Step.Actions>
          </Step.Root>
        );
      },
    },
  ]),
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

export const GuidedTourOverlay = styled(Box)`
  position: fixed;
  inset: 0;
  background-color: rgba(50, 50, 77, 0.2);
  z-index: 10;
  pointer-events: none;
`;

const UnstableGuidedTourTooltip = ({
  children,
  content,
  tourName,
  step,
}: {
  children: React.ReactNode;
  content: Content;
  tourName: ValidTourName;
  step: number;
}) => {
  const disabledUnstableGuidedTour = !window.strapi.future.isEnabled('unstableGuidedTour');
  const state = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.state);
  const dispatch = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.dispatch);
  const Step = React.useMemo(() => createStepComponents(tourName), [tourName]);

  const isCurrentStep = disabledUnstableGuidedTour
    ? undefined
    : state.tours[tourName].currentStep === step;
  const isPopoverOpen = disabledUnstableGuidedTour
    ? undefined
    : isCurrentStep && !state.tours[tourName].isCompleted;

  // Lock the scroll
  React.useEffect(() => {
    if (!isPopoverOpen || disabledUnstableGuidedTour) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [disabledUnstableGuidedTour, isPopoverOpen]);

  if (disabledUnstableGuidedTour) {
    return children;
  }

  return (
    <>
      {isPopoverOpen && <GuidedTourOverlay />}
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
};

function createTour<const T extends ReadonlyArray<TourStep<string>>>(tourName: string, steps: T) {
  type Components = {
    [K in T[number]['name']]: React.ComponentType<{ children: React.ReactNode }>;
  };

  const tour = steps.reduce((acc, step, index) => {
    if (step.name in acc) {
      throw Error(`The tour: ${tourName} with step: ${step.name} has already been registered`);
    }

    acc[step.name as keyof Components] = ({ children }: { children: React.ReactNode }) => (
      <UnstableGuidedTourTooltip
        tourName={tourName as ValidTourName}
        step={index}
        content={step.content}
      >
        {children}
      </UnstableGuidedTourTooltip>
    );

    return acc;
  }, {} as Components);

  return tour;
}

export type { Content, Tours };
export { tours };
