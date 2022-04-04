import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  ModalLayout,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { Typography } from '@strapi/design-system/Typography';
import reducer, { initialState } from './reducer';
import stepper from './stepper';

const LogoModalStepper = ({ initialStep, isOpen, onClose }) => {
  const [{ currentStep, localImage }, dispatch] = useReducer(reducer, initialState);
  const { Component, modalTitle, next } = stepper[currentStep];
  const { formatMessage } = useIntl();

  useEffect(() => {
    if (isOpen) {
      goTo(initialStep);
    }
    // Disabling the rule because we just want to open the modal at a specific step
    // then we let the stepper handle the navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const goTo = to => {
    dispatch({
      type: 'GO_TO',
      to,
    });
  };

  const setLocalImage = asset => {
    dispatch({
      type: 'SET_LOCAL_IMAGE',
      value: asset,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalLayout labelledBy="modal" onClose={onClose}>
      <ModalHeader>
        <Typography fontWeight="bold" as="h2" id="modal">
          {formatMessage(modalTitle)}
        </Typography>
      </ModalHeader>
      <ModalBody>
        <Component setLocalImage={setLocalImage} localImage={localImage} goTo={goTo} next={next} />
      </ModalBody>
      <ModalFooter />
    </ModalLayout>
  );
};

LogoModalStepper.propTypes = {
  initialStep: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LogoModalStepper;
