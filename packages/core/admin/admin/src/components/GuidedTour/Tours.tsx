import * as React from 'react';

import { Box, Popover, Portal, Link } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useGetGuidedTourMetaQuery } from '../../services/admin';

import { type State, type Action, useGuidedTour, ValidTourName, CompletedActions } from './Context';
import { contentManagerSteps } from './Steps/ContentManagerSteps';
import { contentTypeBuilderSteps } from './Steps/ContentTypeBuilderSteps';
import { GotItAction, Step, StepCount, createStepComponents } from './Steps/Step';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from './utils/constants';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const tours = {
  contentTypeBuilder: createTour('contentTypeBuilder', contentTypeBuilderSteps),
  contentManager: createTour('contentManager', contentManagerSteps),
  apiTokens: createTour('apiTokens', [
    {
      name: 'Introduction',
      content: ({ Step }) => (
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
      ),
    },
    {
      name: 'ManageAPIToken',
      content: ({ Step }) => (
        <Step.Root side="bottom" align="end">
          <Step.Title
            id="tours.apiTokens.ManageAPIToken.title"
            defaultMessage="Manage an API token"
          />
          <Step.Content
            id="tours.apiTokens.ManageAPIToken.content"
            defaultMessage='Click the "Pencil" icon to view and update an existing API token.'
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'ViewAPIToken',
      content: ({ Step, dispatch }) => (
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
      ),
    },
    {
      name: 'CopyAPIToken',
      content: ({ Step, dispatch }) => (
        <Step.Root side="bottom" align="start" sideOffset={-5}>
          <Step.Title
            id="tours.apiTokens.CopyAPIToken.title"
            defaultMessage="Copy your new API token"
          />
          <Step.Content
            id="tours.apiTokens.CopyAPIToken.content"
            defaultMessage="Copy your API token"
            values={{
              spacer: <Box paddingTop={2} />,
              a: (msg) => (
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
      ),
    },
    {
      name: 'Finish',
      content: ({ Step }) => (
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
      ),
      when: (completedActions) =>
        completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.apiTokens.copyToken),
    },
  ]),
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

  if (!state.enabled) {
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

  const hasApiSchema =
    Object.keys(guidedTourMeta?.data?.schemas ?? {}).filter((key) => key.startsWith('api::'))
      .length > 0;

  React.useEffect(() => {
    if (hasApiSchema) {
      /**
       * Fallback sync for:
       *
       * When the user already has a schema (for whatever reason),
       * allow them to proceed to the content manager tour
       *
       * In the event the save fails in the CTB (as it often does),
       * ensure the tour can still proceed as it should.
       */
      dispatch({
        type: 'set_completed_actions',
        payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema],
      });
    }
  }, [dispatch, hasApiSchema]);

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
};

export function createTour<const T extends ReadonlyArray<TourStep<string>>>(
  tourName: string,
  steps: T
) {
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
