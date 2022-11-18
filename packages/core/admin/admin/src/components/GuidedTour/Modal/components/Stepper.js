import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { pxToRem, LinkButton } from '@strapi/helper-plugin';
import { Typography, Button, Box, Flex } from '@strapi/design-system';
import ArrowRight from '@strapi/icons/ArrowRight';
import Content from './Content';
import StepLine from '../../Stepper/StepLine';
import StepNumberWithPadding from './StepNumberWithPadding';
import { IS_DONE, IS_ACTIVE } from '../../constants';

const StepperModal = ({
  title,
  content,
  cta,
  onCtaClick,
  sectionIndex,
  stepIndex,
  hasSectionAfter,
}) => {
  const { formatMessage } = useIntl();

  const hasSectionBefore = sectionIndex > 0;
  const hasStepsBefore = stepIndex > 0;
  const nextSectionIndex = sectionIndex + 1;

  return (
    <>
      <Flex alignItems="stretch">
        <Flex marginRight={8} justifyContent="center" minWidth={pxToRem(30)}>
          {hasSectionBefore && <StepLine type={IS_DONE} minHeight={pxToRem(24)} />}
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
          <StepNumberWithPadding
            number={sectionIndex + 1}
            type={hasStepsBefore ? IS_DONE : IS_ACTIVE}
          />
        </Flex>
        <Typography variant="alpha" fontWeight="bold" textColor="neutral800" as="h3" id="title">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Flex alignItems="stretch">
        <Flex marginRight={8} direction="column" justifyContent="center" minWidth={pxToRem(30)}>
          {hasSectionAfter && (
            <>
              <StepLine type={IS_DONE} />
              {hasStepsBefore && (
                <StepNumberWithPadding number={nextSectionIndex + 1} type={IS_ACTIVE} last />
              )}
            </>
          )}
        </Flex>
        <Box>
          <Content {...content} />
          {cta &&
            (cta.target ? (
              <LinkButton endIcon={<ArrowRight />} onClick={onCtaClick} to={cta.target}>
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
            <StepLine type={IS_DONE} minHeight={pxToRem(24)} />
          </Flex>
        </Box>
      )}
    </>
  );
};

StepperModal.defaultProps = {
  currentStep: null,
  cta: undefined,
};

StepperModal.propTypes = {
  sectionIndex: PropTypes.number.isRequired,
  stepIndex: PropTypes.number.isRequired,
  hasSectionAfter: PropTypes.bool.isRequired,
  content: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
  cta: PropTypes.shape({
    target: PropTypes.string,
    title: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
    }),
  }),
  currentStep: PropTypes.string,
  onCtaClick: PropTypes.func.isRequired,
  title: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

export default StepperModal;
