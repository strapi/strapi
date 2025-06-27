import * as React from 'react';

import { Box, Popover } from '@strapi/design-system';
import { styled } from 'styled-components';

import { type GetGuidedTourMeta } from '../../../../shared/contracts/admin';
import { useGetGuidedTourMetaQuery } from '../../services/admin';

import { type State, type Action, unstableUseGuidedTour, ValidTourName } from './Context';
import { Step, createStepComponents } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const tours = {
  TEST: createTour('TEST', [
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
    {
      name: 'Done',
      requiredActions: ['didCreateApiToken'],
      content: (Step) => (
        <Step.Root align="start">
          <Step.Title id="tours.contentManager.CreateEntry.title" defaultMessage="Create entry" />
          <Step.Content
            id="tours.contentManager.CreateEntry.content"
            defaultMessage="Click this button to create an entry"
          />
          <Step.Actions />
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
`;

const UnstableGuidedTourTooltip = ({
  children,
  content,
  tourName,
  step,
  requiredActions,
}: {
  children: React.ReactNode;
  content: Content;
  tourName: ValidTourName;
  step: number;
  requiredActions?: GetGuidedTourMeta.Response['data']['completedActions'];
}) => {
  const { data: guidedTourMeta } = useGetGuidedTourMetaQuery();

  const state = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.state);
  const dispatch = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.dispatch);

  const Step = React.useMemo(() => createStepComponents(tourName), [tourName]);

  const isCurrentStep = state.tours[tourName].currentStep === step;
  const hasCompletedRequiredActions =
    requiredActions?.every((action) => {
      return guidedTourMeta?.data?.completedActions.includes(action);
    }) ?? true;
  const hasFutureFlag = window.strapi.future.isEnabled('unstableGuidedTour');
  const isEnabled =
    guidedTourMeta?.data?.isFirstSuperAdminUser &&
    !state.tours[tourName].isCompleted &&
    hasFutureFlag;

  const isPopoverOpen = isEnabled && isCurrentStep && hasCompletedRequiredActions;

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
  requiredActions?: GetGuidedTourMeta.Response['data']['completedActions'];
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
        requiredActions={step.requiredActions}
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
