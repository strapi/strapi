import * as React from 'react';

import { Popover, Box, Flex, Button, Typography } from '@strapi/design-system';
import { FormattedMessage, type MessageDescriptor } from 'react-intl';
import { styled } from 'styled-components';

import { unstableUseGuidedTour, ValidTourName } from './Context';

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
};

type WithActionsChildren = {
  children: React.ReactNode;
  showStepCount?: boolean;
  showSkip?: boolean;
};

type WithActionsProps = {
  children?: undefined;
  showStepCount?: boolean;
  showSkip?: boolean;
};

type StepProps = WithChildren | WithIntl;
type ActionsProps = WithActionsChildren | WithActionsProps;

type Step = {
  Root: React.ForwardRefExoticComponent<React.ComponentProps<typeof Popover.Content>>;
  Title: (props: StepProps) => React.ReactNode;
  Content: (props: StepProps) => React.ReactNode;
  Actions: (props: ActionsProps) => React.ReactNode;
};

const ActionsContainer = styled(Flex)`
  border-top: ${({ theme }) => `1px solid ${theme.colors.neutral150}`};
`;

const createStepComponents = (tourName: ValidTourName): Step => ({
  Root: React.forwardRef((props, ref) => (
    <Popover.Content ref={ref} side="top" align="center" {...props}>
      <Flex width="360px" direction="column" alignItems="start">
        {props.children}
      </Flex>
    </Popover.Content>
  )),

  Title: (props) => {
    return (
      <Box paddingTop={5} paddingLeft={5} paddingRight={5} paddingBottom={1} width="100%">
        {'children' in props ? (
          props.children
        ) : (
          <Typography tag="div" variant="omega" fontWeight="bold">
            <FormattedMessage tagName="h1" id={props.id} defaultMessage={props.defaultMessage} />
          </Typography>
        )}
      </Box>
    );
  },

  Content: (props) => (
    <Box paddingBottom={5} paddingLeft={5} paddingRight={5} width="100%">
      {'children' in props ? (
        props.children
      ) : (
        <Typography tag="div" variant="omega">
          <FormattedMessage tagName="p" id={props.id} defaultMessage={props.defaultMessage} />
        </Typography>
      )}
    </Box>
  ),

  Actions: ({ showStepCount = true, showSkip = false, ...props }) => {
    const dispatch = unstableUseGuidedTour('GuidedTourPopover', (s) => s.dispatch);
    const state = unstableUseGuidedTour('GuidedTourPopover', (s) => s.state);
    const currentStep = state.tours[tourName].currentStep + 1;
    const tourLength = state.tours[tourName].length - 1;

    return (
      <ActionsContainer width="100%" padding={3} paddingLeft={5}>
        {'children' in props ? (
          props.children
        ) : (
          <Flex flex={1} justifyContent={showStepCount ? 'space-between' : 'flex-end'}>
            {showStepCount && (
              <Typography variant="omega" fontSize="12px">
                <FormattedMessage
                  id="tours.stepCount"
                  defaultMessage="Step {currentStep} of {tourLength}"
                  values={{ currentStep, tourLength }}
                />
              </Typography>
            )}
            <Flex gap={2}>
              {showSkip && (
                <Button
                  variant="tertiary"
                  onClick={() => dispatch({ type: 'skip_tour', payload: tourName })}
                >
                  <FormattedMessage id="tours.skip" defaultMessage="Skip" />
                </Button>
              )}
              <Button onClick={() => dispatch({ type: 'next_step', payload: tourName })}>
                <FormattedMessage id="tours.next" defaultMessage="Next" />
              </Button>
            </Flex>
          </Flex>
        )}
      </ActionsContainer>
    );
  },
});

export type { Step };
export { createStepComponents };
