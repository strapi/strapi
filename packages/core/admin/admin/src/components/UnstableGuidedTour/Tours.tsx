import * as React from 'react';

import { Box, Popover } from '@strapi/design-system';
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
        <Step.Root sideOffset={-36} side={'top'} align={'center'}>
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
        <Step.Root sideOffset={-36}>
          <Step.Title id="tours.contentManager.Fields.title" defaultMessage="Fields" />
          <Step.Content
            id="tours.contentManager.Fields.content"
            defaultMessage="Add content to the fields created in the Content-Type Builder."
          />
          <Step.Actions showSkip />
        </Step.Root>
      ),
    },
    {
      name: 'Publish',
      content: (Step) => (
        <Step.Root sideOffset={-36}>
          <Step.Title id="tours.contentManager.Publish.title" defaultMessage="Publish" />
          <Step.Content
            id="tours.contentManager.Publish.content"
            defaultMessage="Publish entries to make their content available through the Document Service API."
          />
          <Step.Actions showSkip />
        </Step.Root>
      ),
    },
    {
      name: 'Final',
      content: (Step) => (
        <Step.Root sideOffset={-36}>
          <Step.Title
            id="tours.contentManager.Final.title"
            defaultMessage="It’s time to create API Tokens!"
          />
          <Step.Content
            id="tours.contentManager.Final.content"
            defaultMessage="Now that you’ve created and published content, time to create API tokens and set up permissions."
          />
          <Step.Actions showSkip />
        </Step.Root>
      ),
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
  if (!window.strapi.future.isEnabled('unstableGuidedTour')) {
    return children;
  }
  const state = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.state);
  const dispatch = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.dispatch);
  const Step = React.useMemo(() => createStepComponents(tourName), [tourName]);

  const isCurrentStep = state.tours[tourName].currentStep === step;
  const isPopoverOpen = isCurrentStep && !state.tours[tourName].isCompleted;

  // Lock the scroll
  React.useEffect(() => {
    if (!isPopoverOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isPopoverOpen]);

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
