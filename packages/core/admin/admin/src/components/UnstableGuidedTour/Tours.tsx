import * as React from 'react';

import { Box, Popover, Portal, Flex, LinkButton } from '@strapi/design-system';
import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { useGetGuidedTourMetaQuery } from '../../services/admin';

import {
  type State,
  type Action,
  unstableUseGuidedTour,
  ValidTourName,
  ExtendedCompletedActions,
} from './Context';
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
        <Step.Root side={'top'} sideOffset={-36}>
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
        <Step.Root side="bottom" sideOffset={20} align="end">
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
        <Step.Root side="bottom" align="start">
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
      when: (completedActions) => completedActions.includes('didCreateApiToken'),
    },
    {
      name: 'Finish',
      content: (Step) => {
        const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);
        return (
          <Step.Root side="right" align="start" sideOffset={32}>
            <Step.Title
              id="tours.apiTokens.FinalStep.title"
              defaultMessage="It’s time to deploy your application!"
            />
            <Step.Content
              id="tours.apiTokens.FinalStep.content"
              defaultMessage="Your application is ready to be deployed and its content to be shared with the world!"
            />
            <Step.Actions showStepCount={false}>
              <Flex justifyContent="end" width={'100%'}>
                <LinkButton
                  onClick={() => {
                    dispatch({ type: 'next_step', payload: 'apiTokens' });
                  }}
                  tag={NavLink}
                  to="/"
                >
                  <FormattedMessage id="tours.gotIt" defaultMessage="Got it" />
                </LinkButton>
              </Flex>
            </Step.Actions>
          </Step.Root>
        );
      },
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
