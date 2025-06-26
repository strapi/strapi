import * as React from 'react';

import { Box, Popover } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useAuth } from '../../features/Auth';

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
  // TODO: To remove when the future is ready to be released
  const disabledUnstableGuidedTour = !window.strapi.future.isEnabled('unstableGuidedTour');
  const state = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.state);
  const dispatch = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.dispatch);
  const Step = React.useMemo(() => createStepComponents(tourName), [tourName]);

  // TODO: Condition to remove when the future is ready to be released
  const isCurrentStep = disabledUnstableGuidedTour
    ? undefined
    : state.tours[tourName].currentStep === step;
  // TODO: Condition to remove when the future is ready to be released
  const isPopoverOpen = disabledUnstableGuidedTour
    ? undefined
    : isCurrentStep && !state.tours[tourName].isCompleted;

  // Lock the scroll
  React.useEffect(() => {
    /**
     *  TODO: replace with if (!isPopoverOpen) return;
     *  when the guided tour is ready to be released
     */
    if (!isPopoverOpen || disabledUnstableGuidedTour) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [disabledUnstableGuidedTour, isPopoverOpen]);

  // TODO: To remove when the future is ready to be released
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
