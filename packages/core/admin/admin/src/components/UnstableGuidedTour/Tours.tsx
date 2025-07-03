import * as React from 'react';

import { Box, Popover, Portal } from '@strapi/design-system';
import { styled } from 'styled-components';

import { type GetGuidedTourMeta } from '../../../../shared/contracts/admin';
import { useGetGuidedTourMetaQuery } from '../../services/admin';

import { type State, type Action, unstableUseGuidedTour, ValidTourName } from './Context';
import { Step, createStepComponents } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const tours = {
  contentTypeBuilder: createTour('contentTypeBuilder', [
    {
      name: 'Introduction',
      content: (Step) => (
        <Step.Root side="bottom">
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
        <Step.Root side="right" sideOffset={26}>
          <Step.Title
            id="tours.contentTypeBuilder.CollectionTypes.title"
            defaultMessage="Collection Types"
          />
          <Step.Content
            id="tours.contentTypeBuilder.CollectionTypes.content"
            defaultMessage="Create and manage your content structure with collection types, single types and components."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'SingleTypes',
      content: (Step) => (
        <Step.Root side="right" sideOffset={26}>
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
      content: (Step) => (
        <Step.Root side="right" sideOffset={26}>
          <Step.Title id="tours.contentTypeBuilder.Components.title" defaultMessage="Components" />
          <Step.Content
            id="tours.contentTypeBuilder.Components.content"
            defaultMessage="A reusable content structure that can be used across multiple content types, such as buttons, sliders or cards."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'Finish',
      content: (Step) => (
        <Step.Root side="right" sideOffset={32}>
          <Step.Title
            id="tours.contentTypeBuilder.Finish.title"
            defaultMessage="It’s time to create content!"
          />
          <Step.Content
            id="tours.contentTypeBuilder.Finish.content"
            defaultMessage="Now that you created content types, you’ll be able to create content in the content manager."
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
      content: (Step) => (
        <Step.Root side="top">
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
        <Step.Root side={'top'} align="start" sideOffset={-36}>
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
      content: (Step) => (
        <Step.Root side="left" align="center" sideOffset={20}>
          <Step.Title id="tours.contentManager.Publish.title" defaultMessage="Publish" />
          <Step.Content
            id="tours.contentManager.Publish.content"
            defaultMessage="Publish entries to make their content available through the Document Service API."
          />
          <Step.Actions />
        </Step.Root>
      ),
    },
    {
      name: 'Finish',
      content: (Step) => (
        <Step.Root side="right" sideOffset={32}>
          <Step.Title
            id="tours.contentManager.FinalStep.title"
            defaultMessage="It’s time to create API Tokens!"
          />
          <Step.Content
            id="tours.contentManager.FinalStep.content"
            defaultMessage="Now that you’ve created and published content, time to create API tokens and set up permissions."
          />
          <Step.Actions showStepCount={false} to="/settings/api-tokens" />
        </Step.Root>
      ),
      when: (completedActions) => completedActions.includes('didCreateContent'),
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

type GuidedTourTooltipProps = {
  children: React.ReactNode;
  content: Content;
  tourName: ValidTourName;
  step: number;
  when?: (completedActions: GetGuidedTourMeta.Response['data']['completedActions']) => boolean;
};

const UnstableGuidedTourTooltip = ({ children, ...props }: GuidedTourTooltipProps) => {
  const state = unstableUseGuidedTour('TooltipWrapper', (s) => s.state);
  const hasFutureFlag = window.strapi.future.isEnabled('unstableGuidedTour');

  if (!state.enabled) {
    return <>{children}</>;
  }

  if (!hasFutureFlag) {
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

  const state = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.state);
  const dispatch = unstableUseGuidedTour('UnstableGuidedTourTooltip', (s) => s.dispatch);

  const isCurrentStep = state.tours[tourName].currentStep === step;
  const isStepConditionMet = when ? when(guidedTourMeta?.data?.completedActions ?? []) : true;
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
  when?: (completedActions: GetGuidedTourMeta.Response['data']['completedActions']) => boolean;
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
        <UnstableGuidedTourTooltip
          tourName={tourName as ValidTourName}
          step={index}
          content={step.content}
          when={step.when}
        >
          {children}
        </UnstableGuidedTourTooltip>
      );
    };

    return acc;
  }, {} as Components);

  return tour;
}

export type { Content, Tours };
export { tours };
