import * as React from 'react';

import {
  Popover,
  Box,
  Flex,
  Button,
  Typography,
  LinkButton,
  FlexProps,
} from '@strapi/design-system';
import { FormattedMessage, useIntl, type MessageDescriptor } from 'react-intl';
import { To, NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { useTracking } from '../../../features/Tracking';
import { useGuidedTour, type ValidTourName } from '../Context';
import { tours } from '../Tours';

/* -------------------------------------------------------------------------------------------------
 * Common Step Components
 * -----------------------------------------------------------------------------------------------*/

const StepCount = ({
  tourName,
  displayedCurrentStep,
  displayedTourLength,
}: {
  tourName: ValidTourName;
  displayedCurrentStep?: number;
  displayedTourLength?: number;
}) => {
  const state = useGuidedTour('GuidedTourPopover', (s) => s.state);
  const currentStep = displayedCurrentStep ?? state.tours[tourName].currentStep + 1;
  const displayedStepCount = displayedTourLength ?? tours[tourName]._meta.displayedStepCount;

  return (
    <Typography variant="omega" fontSize="12px">
      <FormattedMessage
        id="tours.stepCount"
        defaultMessage="Step {currentStep} of {tourLength}"
        values={{ currentStep, tourLength: displayedStepCount }}
      />
    </Typography>
  );
};

const GotItAction = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button onClick={onClick}>
      <FormattedMessage id="tours.gotIt" defaultMessage="Got it" />
    </Button>
  );
};

export type DefaultActionsProps = {
  showSkip?: boolean;
  showPrevious?: boolean;
  to?: To;
  onNextStep?: () => void;
  onPreviousStep?: () => void;
  tourName: ValidTourName;
};
const DefaultActions = ({
  showSkip,
  showPrevious,
  to,
  tourName,
  onNextStep,
  onPreviousStep,
}: DefaultActionsProps) => {
  const { trackUsage } = useTracking();
  const dispatch = useGuidedTour('GuidedTourPopover', (s) => s.dispatch);
  const state = useGuidedTour('GuidedTourPopover', (s) => s.state);
  const currentStep = state.tours[tourName].currentStep + 1;
  const actualTourLength = tours[tourName]._meta.totalStepCount;

  const handleSkip = () => {
    trackUsage('didSkipGuidedTour', { name: tourName });
    dispatch({ type: 'skip_tour', payload: tourName });
  };

  const handleNextStep = () => {
    if (currentStep === actualTourLength) {
      trackUsage('didCompleteGuidedTour', { name: tourName });
    }

    if (onNextStep) {
      onNextStep();
    } else {
      dispatch({ type: 'next_step', payload: tourName });
    }
  };

  const handlePreviousStep = () => {
    if (onPreviousStep) {
      onPreviousStep();
    } else {
      dispatch({ type: 'previous_step', payload: tourName });
    }
  };

  return (
    <Flex gap={2}>
      {showSkip && (
        <Button variant="tertiary" onClick={handleSkip}>
          <FormattedMessage id="tours.skip" defaultMessage="Skip" />
        </Button>
      )}
      {!showSkip && showPrevious && (
        <Button variant="tertiary" onClick={handlePreviousStep}>
          <FormattedMessage id="tours.previous" defaultMessage="Previous" />
        </Button>
      )}
      {to ? (
        <LinkButton tag={NavLink} to={to} onClick={handleNextStep}>
          <FormattedMessage id="tours.next" defaultMessage="Next" />
        </LinkButton>
      ) : (
        <Button onClick={handleNextStep}>
          <FormattedMessage id="tours.next" defaultMessage="Next" />
        </Button>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step factory
 * -----------------------------------------------------------------------------------------------*/

type WithChildren = {
  children: React.ReactNode;
  id?: never;
  defaultMessage?: never;
};

type WithIntl = {
  children?: undefined;
  id: MessageDescriptor['id'];
  defaultMessage: MessageDescriptor['defaultMessage'];
  withArrow?: boolean;
};

type WithActionsChildren = {
  children: React.ReactNode;
  showStepCount?: boolean;
  showSkip?: boolean;
  showPrevious?: boolean;
};

type WithActionsProps = {
  children?: undefined;
  showStepCount?: boolean;
  showSkip?: boolean;
  showPrevious?: boolean;
};

type StepProps = WithChildren | WithIntl;
type ActionsProps = WithActionsChildren | WithActionsProps;

type Step = {
  Root: React.ForwardRefExoticComponent<
    React.ComponentProps<typeof Popover.Content> & { withArrow?: boolean }
  >;
  Title: (props: StepProps) => React.ReactNode;
  Content: (
    props: StepProps & {
      values?: Record<string, React.ReactNode | ((chunks: React.ReactNode) => React.ReactNode)>;
    }
  ) => React.ReactNode;
  Actions: (props: ActionsProps & { to?: string } & FlexProps) => React.ReactNode;
};

const ActionsContainer = styled(Flex)`
  border-top: ${({ theme }) => `1px solid ${theme.colors.neutral150}`};
`;

const ContentContainer = styled(Box)`
  p {
    margin-top: ${({ theme }) => theme.spaces[5]};
  }
  ul {
    list-style-type: disc;
    padding-left: ${({ theme }) => theme.spaces[4]};
  }
`;

/**
 * TODO:
 * We should probably move all arrow styles + svg to the DS
 */
const PopoverArrow = styled(Popover.Arrow)`
  fill: ${({ theme }) => theme.colors.neutral0};
  transform: translateY(-16px) rotate(-90deg);
`;

const createStepComponents = (tourName: ValidTourName): Step => ({
  Root: React.forwardRef(({ withArrow = true, ...props }, ref) => {
    return (
      <Popover.Content
        ref={ref}
        aria-labelledby="guided-tour-title"
        side="top"
        align="center"
        style={{ border: 'none' }}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {withArrow && (
          <PopoverArrow asChild>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="23"
              height="25"
              viewBox="0 0 23 25"
              fill="none"
            >
              <path d="M11 24.5L1.82843 15.3284C0.266332 13.7663 0.26633 11.2337 1.82843 9.67157L11 0.5L23 12.5L11 24.5Z" />
            </svg>
          </PopoverArrow>
        )}
        <Flex width="360px" direction="column" alignItems="start">
          {props.children}
        </Flex>
      </Popover.Content>
    );
  }),

  Title: (props) => {
    return (
      <Box paddingTop={5} paddingLeft={5} paddingRight={5} paddingBottom={1} width="100%">
        {'children' in props ? (
          props.children
        ) : (
          <Typography tag="h1" id="guided-tour-title" variant="omega" fontWeight="bold">
            <FormattedMessage id={props.id} defaultMessage={props.defaultMessage} />
          </Typography>
        )}
      </Box>
    );
  },

  Content: (props) => {
    const { formatMessage } = useIntl();
    let content = '';
    if (!('children' in props)) {
      content = formatMessage({
        id: props.id,
        defaultMessage: props.defaultMessage,
      });
    }
    return (
      <Box paddingBottom={5} paddingLeft={5} paddingRight={5} width="100%">
        {'children' in props ? (
          props.children
        ) : (
          <ContentContainer>
            <Typography tag="div" variant="omega" dangerouslySetInnerHTML={{ __html: content }} />
          </ContentContainer>
        )}
      </Box>
    );
  },

  Actions: ({
    showStepCount = true,
    showPrevious = true,
    showSkip = false,
    to,
    children,
    ...flexProps
  }) => {
    return (
      <ActionsContainer
        width="100%"
        padding={3}
        paddingLeft={5}
        justifyContent={showStepCount ? 'space-between' : 'flex-end'}
        {...flexProps}
      >
        {children ? (
          children
        ) : (
          <>
            {showStepCount && <StepCount tourName={tourName} />}
            <DefaultActions
              tourName={tourName}
              showSkip={showSkip}
              showPrevious={!showSkip && showPrevious}
              to={to}
            />
          </>
        )}
      </ActionsContainer>
    );
  },
});

export type { Step };
export { createStepComponents, GotItAction, StepCount, DefaultActions };
