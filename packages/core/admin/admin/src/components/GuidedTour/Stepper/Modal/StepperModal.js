import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { pxToRem } from '@strapi/helper-plugin';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import Content from '../../GuidedTourModal/Content';
import StepLine from '../StepLine';
import StepNumberWithPadding from './StepNumberWithPadding';

const LeftSideBox = styled(Flex)`
  margin-right: ${({ theme }) => theme.spaces[8]};
  flex-shrink: 0;
`;

const StepperModal = ({ title, content, cta, onCTA, sectionIndex, stepIndex, hasSectionAfter }) => {
  const { formatMessage } = useIntl();

  const hasSectionBefore = sectionIndex > 0;
  const hasStepsBefore = stepIndex > 0;
  const nextSectionIndex = sectionIndex + 1;

  return (
    <>
      <Flex alignItems="stretch">
        <LeftSideBox justifyContent="center" width={pxToRem(30)}>
          {hasSectionBefore && <StepLine type="isDone" minHeight={pxToRem(24)} />}
        </LeftSideBox>
        <Typography variant="sigma" textColor="primary600">
          {formatMessage({
            id: 'app.components.GuidedTour.modal.title',
            defaultMessage: '3 simple step',
          })}
        </Typography>
      </Flex>
      <Flex>
        <LeftSideBox width={pxToRem(30)}>
          <StepNumberWithPadding
            number={sectionIndex + 1}
            type={hasStepsBefore ? 'isDone' : 'isActive'}
          />
        </LeftSideBox>
        <Typography variant="alpha" fontWeight="bold" textColor="neutral800" as="h3" id="title">
          {formatMessage(title)}
        </Typography>
      </Flex>
      <Flex alignItems="stretch">
        <LeftSideBox direction="column" justifyContent="center" width={pxToRem(30)}>
          {hasSectionAfter && (
            <>
              <StepLine type="isDone" />
              {hasStepsBefore && (
                <StepNumberWithPadding number={nextSectionIndex + 1} type="isActive" last />
              )}
            </>
          )}
        </LeftSideBox>
        <Box>
          <Content {...content} />
          <Button onClick={onCTA}>{formatMessage(cta.title)}</Button>
        </Box>
      </Flex>
      {hasStepsBefore && hasSectionAfter && (
        <Box paddingTop={3}>
          <LeftSideBox justifyContent="center" width={pxToRem(30)}>
            <StepLine type="isDone" minHeight={pxToRem(24)} />
          </LeftSideBox>
        </Box>
      )}
    </>
  );
};

StepperModal.defaultProps = {
  currentStep: null,
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
  }).isRequired,
  currentStep: PropTypes.string,
  onCTA: PropTypes.func.isRequired,
  title: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

export default StepperModal;
