import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  FlexComponent,
  FocusTrap,
  IconButton,
  Portal,
  Typography,
  LinkButton,
} from '@strapi/design-system';
import { ArrowRight, Cross } from '@strapi/icons';
import get from 'lodash/get';
import { MessageDescriptor, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { useTracking } from '../../features/Tracking';

import { LAYOUT_DATA, STATES } from './constants';
import { Number, VerticalDivider } from './Ornaments';
import { GuidedTourContextValue, useGuidedTour } from './Provider';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourModal
 * -----------------------------------------------------------------------------------------------*/

const GuidedTourModal = () => {
  const guidedTour = useGuidedTour('GuidedTourModal', (state) => state);

  const {
    currentStep,
    guidedTourState,
    setCurrentStep,
    setStepState,
    isGuidedTourVisible,
    setSkipped,
  } = guidedTour;

  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  if (!currentStep || !isGuidedTourVisible) {
    return null;
  }

  const stepData = get(LAYOUT_DATA, currentStep);
  const sectionKeys = Object.keys(guidedTourState);
  const [sectionName, stepName] = currentStep.split('.') as [
    keyof GuidedTourContextValue['guidedTourState'],
    string,
  ];
  const sectionIndex = sectionKeys.indexOf(sectionName);
  const stepIndex = Object.keys(guidedTourState[sectionName]).indexOf(stepName);
  const hasSectionAfter = sectionIndex < sectionKeys.length - 1;
  const hasStepAfter = stepIndex < Object.keys(guidedTourState[sectionName]).length - 1;

  const handleCtaClick = () => {
    setStepState(currentStep, true);

    if (stepData) {
      trackUsage(stepData.trackingEvent);
    }

    setCurrentStep(null);
  };

  const handleSkip = () => {
    setSkipped(true);
    setCurrentStep(null);
    trackUsage('didSkipGuidedtour');
  };

  return (
    <Portal>
      <ModalWrapper onClick={handleCtaClick} padding={8} justifyContent="center">
        <FocusTrap onEscape={handleCtaClick}>
          <Flex
            direction="column"
            alignItems="stretch"
            background="neutral0"
            width={`66rem`}
            shadow="popupShadow"
            hasRadius
            padding={4}
            gap={8}
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justifyContent="flex-end">
              <IconButton
                onClick={handleCtaClick}
                withTooltip={false}
                label={formatMessage({
                  id: 'app.utils.close-label',
                  defaultMessage: 'Close',
                })}
              >
                <Cross />
              </IconButton>
            </Flex>
            <Box
              paddingLeft={7}
              paddingRight={7}
              paddingBottom={!hasStepAfter && !hasSectionAfter ? 8 : 0}
            >
              <GuidedTourStepper
                title={stepData && 'title' in stepData ? stepData.title : undefined}
                cta={stepData && 'cta' in stepData ? stepData.cta : undefined}
                onCtaClick={handleCtaClick}
                sectionIndex={sectionIndex}
                stepIndex={stepIndex}
                hasSectionAfter={hasSectionAfter}
              >
                {stepData && 'content' in stepData && <GuidedTourContent {...stepData.content} />}
              </GuidedTourStepper>
            </Box>
            {!(!hasStepAfter && !hasSectionAfter) && (
              <Flex justifyContent="flex-end">
                <Button variant="tertiary" onClick={handleSkip}>
                  {formatMessage({
                    id: 'app.components.GuidedTour.skip',
                    defaultMessage: 'Skip the tour',
                  })}
                </Button>
              </Flex>
            )}
          </Flex>
        </FocusTrap>
      </ModalWrapper>
    </Portal>
  );
};

const ModalWrapper = styled<FlexComponent>(Flex)`
  position: fixed;
  z-index: 4;
  inset: 0;
  /* this is theme.colors.neutral800 with opacity */
  background: ${({ theme }) => `${theme.colors.neutral800}1F`};
`;

/* -------------------------------------------------------------------------------------------------
 * GuidedTourStepper
 * -----------------------------------------------------------------------------------------------*/

interface GuidedTourStepperProps {
  title: MessageDescriptor | undefined;
  children: React.ReactNode;
  cta?: {
    title: MessageDescriptor;
    target?: string;
  };
  onCtaClick: () => void;
  sectionIndex: number;
  stepIndex: number;
  hasSectionAfter: boolean;
}

const GuidedTourStepper = ({
  title,
  children,
  cta,
  onCtaClick,
  sectionIndex,
  stepIndex,
  hasSectionAfter,
}: GuidedTourStepperProps) => {
  const { formatMessage } = useIntl();

  const hasSectionBefore = sectionIndex > 0;
  const hasStepsBefore = stepIndex > 0;
  const nextSectionIndex = sectionIndex + 1;

  return (
    <>
      <Flex alignItems="stretch">
        <Flex marginRight={8} justifyContent="center" minWidth={`3rem`}>
          {hasSectionBefore && <VerticalDivider state={STATES.IS_DONE} minHeight={`2.4rem`} />}
        </Flex>
        <Typography variant="sigma" textColor="primary600">
          {formatMessage({
            id: 'app.components.GuidedTour.title',
            defaultMessage: '3 steps to get started',
          })}
        </Typography>
      </Flex>
      <Flex>
        <Flex marginRight={8} minWidth={`3rem`}>
          <Number
            state={hasStepsBefore ? STATES.IS_DONE : STATES.IS_ACTIVE}
            paddingTop={3}
            paddingBottom={3}
          >
            {sectionIndex + 1}
          </Number>
        </Flex>
        {title && (
          <Typography variant="alpha" fontWeight="bold" textColor="neutral800" tag="h3" id="title">
            {formatMessage(title)}
          </Typography>
        )}
      </Flex>
      <Flex alignItems="stretch">
        <Flex marginRight={8} direction="column" justifyContent="center" minWidth={`3rem`}>
          {hasSectionAfter && (
            <>
              <VerticalDivider state={STATES.IS_DONE} />
              {hasStepsBefore && (
                <Number state={STATES.IS_ACTIVE} paddingTop={3}>
                  {nextSectionIndex + 1}
                </Number>
              )}
            </>
          )}
        </Flex>
        <Box>
          {children}
          {cta &&
            (cta.target ? (
              <LinkButton
                tag={NavLink}
                endIcon={<ArrowRight />}
                onClick={onCtaClick}
                to={cta.target}
              >
                {formatMessage(cta.title)}
              </LinkButton>
            ) : (
              <Button endIcon={<ArrowRight />} onClick={onCtaClick}>
                {formatMessage(cta.title)}
              </Button>
            ))}
        </Box>
      </Flex>
      {hasStepsBefore && hasSectionAfter && (
        <Box paddingTop={3}>
          <Flex marginRight={8} justifyContent="center" width={`3rem`}>
            <VerticalDivider state={STATES.IS_DONE} minHeight={`2.4rem`} />
          </Flex>
        </Box>
      )}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * GuidedTourContent
 * -----------------------------------------------------------------------------------------------*/

interface GuidedTourContentProps
  extends Required<Pick<MessageDescriptor, 'defaultMessage' | 'id'>> {}

const GuidedTourContent = ({ id, defaultMessage }: GuidedTourContentProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={4} paddingBottom={6}>
      {formatMessage(
        { id, defaultMessage },
        {
          documentationLink: DocumentationLink,
          b: Bold,
          p: Paragraph,
          light: Light,
          ul: List,
          li: ListItem,
        }
      )}
    </Flex>
  );
};

const DocumentationLink = (children: React.ReactNode) => (
  <Typography
    tag="a"
    textColor="primary600"
    target="_blank"
    rel="noopener noreferrer"
    href="https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#api-parameters"
  >
    {children}
  </Typography>
);

const Bold = (children: React.ReactNode) => (
  <Typography fontWeight="semiBold">{children}</Typography>
);

const Paragraph = (children: React.ReactNode) => <Typography>{children}</Typography>;

const Light = (children: React.ReactNode) => (
  <Typography textColor="neutral600">{children}</Typography>
);

const List = (children: React.ReactNode) => (
  <Box paddingLeft={6}>
    <ul>{children}</ul>
  </Box>
);

const LiStyled = styled.li`
  list-style: disc;
  &::marker {
    color: ${({ theme }) => theme.colors.neutral800};
  }
`;

const ListItem = (children: React.ReactNode) => <LiStyled>{children}</LiStyled>;

export { GuidedTourModal };
