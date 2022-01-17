import React, { useEffect, useState } from 'react';
import at from 'lodash/at';
import { useIntl } from 'react-intl';
import {
  ModalLayout,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { useGuidedTour } from '@strapi/helper-plugin';
import layout from '../layout';
import Content from './Content';

const GuidedTourModal = () => {
  const { formatMessage } = useIntl();
  const { currentStep, guidedTourState, setCurrentStep, setStepState } = useGuidedTour();
  const [stepContent, setStepContent] = useState();
  const [isVisible, setIsVisible] = useState(currentStep);

  useEffect(() => {
    if (!currentStep) {
      setIsVisible(false);

      return;
    }

    const [isStepDone] = at(guidedTourState, currentStep);

    setIsVisible(!isStepDone);
  }, [currentStep, guidedTourState]);

  useEffect(() => {
    if (currentStep) {
      const [content] = at(layout, currentStep);
      setStepContent(content);
    }
  }, [currentStep]);

  const handleCTA = () => {
    setStepState(currentStep, true);

    setCurrentStep(null);
  };

  if (isVisible && stepContent) {
    return (
      <ModalLayout onClose={() => {}} labelledBy="title">
        <ModalHeader>
          <Typography fontWeight="bold" textColor="neutral800" as="h3" id="title">
            {formatMessage(stepContent.title)}
          </Typography>
        </ModalHeader>
        <ModalBody>
          <Content {...stepContent.content} />
        </ModalBody>
        <ModalFooter
          endActions={<Button onClick={handleCTA}>{formatMessage(stepContent.cta.title)}</Button>}
        />
      </ModalLayout>
    );
  }

  return null;
};

export default GuidedTourModal;
