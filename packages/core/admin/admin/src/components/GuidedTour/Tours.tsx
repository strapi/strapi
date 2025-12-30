import * as React from 'react';

import { Box, Popover, Portal } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useGetGuidedTourMetaQuery } from '../../services/admin';

import { type State, type Action, useGuidedTour, ValidTourName, CompletedActions } from './Context';
import { apiTokensSteps } from './Steps/ApiTokensSteps';
import { contentManagerSteps } from './Steps/ContentManagerSteps';
import { contentTypeBuilderSteps } from './Steps/ContentTypeBuilderSteps';
import { type Step, createStepComponents } from './Steps/Step';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const tours = {
  contentTypeBuilder: createTour('contentTypeBuilder', contentTypeBuilderSteps),
  contentManager: createTour('contentManager', contentManagerSteps),
  apiTokens: createTour('apiTokens', apiTokensSteps),
  strapiCloud: createTour('strapiCloud', []),
} as const;

type Tours = typeof tours;

/* -------------------------------------------------------------------------------------------------
 * GuidedTourTooltip
 * -----------------------------------------------------------------------------------------------*/

export type StepContentProps = {
  Step: Step;
  state: State;
  dispatch: React.Dispatch<Action>;
};
type Content = (props: StepContentProps) => React.ReactNode;

type GuidedTourTooltipProps = {
  children: React.ReactNode;
  content: Content;
  tourName: ValidTourName;
  step: number;
  when?: (completedActions: CompletedActions) => boolean;
};

const GuidedTourTooltip = ({ children, ...props }: GuidedTourTooltipProps) => {
  const state = useGuidedTour('TooltipWrapper', (s) => s.state);

  if (!state.enabled || state.hidden || process.env.NODE_ENV !== 'development') {
    return children;
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

  const Step = React.useMemo(() => createStepComponents(tourName), [tourName]);

  const hasApiSchema =
    Object.keys(guidedTourMeta?.data?.schemas ?? {}).filter((key) => key.startsWith('api::'))
      .length > 0;

  React.useEffect(() => {
    if (hasApiSchema) {
      /**
       * Fallback sync:
       *
       * When the user already has a schema (ie started project from template with seeded data),
       * allow them to proceed to the content manager tour.
       *
       * When the CTB fails to restart after saving a schema (as it often does)
       */
      dispatch({
        type: 'set_completed_actions',
        payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      });
    }
  }, [dispatch, hasApiSchema, step, tourName]);

  return (
    <>
      {isPopoverOpen && (
        <Portal>
          <GuidedTourOverlay />
        </Portal>
      )}
      <Popover.Root open={isPopoverOpen}>
        <Popover.Anchor>{children}</Popover.Anchor>
        {content({ Step, state, dispatch })}
      </Popover.Root>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Tour factory
 * -----------------------------------------------------------------------------------------------*/

export type TourStep<P extends string> = {
  name: P;
  content: Content;
  when?: (completedActions: CompletedActions) => boolean;
  excludeFromStepCount?: boolean;
};

export function createTour<const T extends ReadonlyArray<TourStep<string>>>(
  tourName: string,
  steps: T
) {
  type Components = {
    [K in T[number]['name']]: React.ComponentType<{ children: React.ReactNode }>;
  };

  const tour = steps.reduce(
    (acc, step, index) => {
      const name = step.name as keyof Components;

      if (name in acc) {
        throw Error(`The tour: ${tourName} with step: ${step.name} has already been registered`);
      }

      (acc as Components)[name] = ({ children }: { children: React.ReactNode }) => {
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

      if (step.excludeFromStepCount) {
        // Subtract all steps registered to be excluded from the step count
        acc._meta.displayedStepCount--;
      }

      return acc;
    },
    { _meta: { totalStepCount: steps.length, displayedStepCount: steps.length } } as Components & {
      _meta: { totalStepCount: number; displayedStepCount: number };
    }
  );

  return tour;
}

export type { Content, Tours };
export { tours };
