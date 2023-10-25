import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  FocusTrap,
  IconButton,
  Portal,
  Typography,
} from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { GuidedTourContextValue, pxToRem, useGuidedTour, useTracking } from '@strapi/helper-plugin';
import { ArrowRight, Cross } from '@strapi/icons';
import get from 'lodash/get';
import { MessageDescriptor, useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

import { LAYOUT_DATA, STATES } from './constants';
import { Number, VerticalDivider } from './Ornaments';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourModal
 * -----------------------------------------------------------------------------------------------*/

const GuidedTourModal = () => {
  const {
    currentStep,
    guidedTourState,
    setCurrentStep,
    setStepState,
    isGuidedTourVisible,
    setSkipped,
  } = useGuidedTour();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  if (!currentStep || !isGuidedTourVisible) {
    return null;
  }

  const stepData = get(LAYOUT_DATA, currentStep);
  const sectionKeys = Object.keys(guidedTourState);
  const [sectionName, stepName] = currentStep.split('.') as [
    keyof GuidedTourContextValue['guidedTourState'],
    string
  ];
  const sectionIndex = sectionKeys.indexOf(sectionName);
  const stepIndex = Object.keys(guidedTourState[sectionName]).indexOf(stepName);
  const hasSectionAfter = sectionIndex < sectionKeys.length - 1;
  const hasStepAfter = stepIndex < Object.keys(guidedTourState[sectionName]).length - 1;

  const handleCtaClick = () => {
    setStepState(currentStep, true);
    trackUsage(stepData.trackingEvent);

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
            width={pxToRem(660)}
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
                aria-label={formatMessage({
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
                title={stepData.title}
                cta={'cta' in stepData ? stepData.cta : undefined}
                onCtaClick={handleCtaClick}
                sectionIndex={sectionIndex}
                stepIndex={stepIndex}
                hasSectionAfter={hasSectionAfter}
              >
                <GuidedTourContent {...stepData.content} />
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

const ModalWrapper = styled(Flex)`
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
  title: MessageDescriptor;
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
        <Flex marginRight={8} justifyContent="center" minWidth={pxToRem(30)}>
          {hasSectionBefore && <VerticalDivider state={STATES.IS_DONE} minHeight={pxToRem(24)} />}
        </Flex>
        <Typography variant="sigma" textColor="primary600">
          {formatMessage({
            id: 'app.components.GuidedTour.title',
            defaultMessage: '3 steps to get started',
          })}
        </Typography>
      </Flex>
      <Flex>
        <Flex marginRight={8} minWidth={pxToRem(30)}>
          <Number
            state={hasStepsBefore ? STATES.IS_DONE : STATES.IS_ACTIVE}
            paddingTop={3}
            paddingBottom={3}
          >
            {sectionIndex + 1}
          </Number>
        </Flex>
        <Typography variant="alpha" fontWeight="bold" textColor="neutral800" as="h3" id="title">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Flex alignItems="stretch">
        <Flex marginRight={8} direction="column" justifyContent="center" minWidth={pxToRem(30)}>
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
                as={NavLink}
                endIcon={<ArrowRight />}
                onClick={onCtaClick}
                // @ts-expect-error - types are not inferred correctly through the as prop.
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
          <Flex marginRight={8} justifyContent="center" width={pxToRem(30)}>
            <VerticalDivider state={STATES.IS_DONE} minHeight={pxToRem(24)} />
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
    as="a"
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
