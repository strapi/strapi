import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
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
  const [{ currentStep }, dispatch] = useReducer(reducer, initialState);
  const { Component, modalTitle } = stepper[currentStep];

  useEffect(() => {
    if (isOpen) {
      goTo(initialStep);
    }
    // Disabling the rule because we just want to let the ability to open the modal
    // at a specific step then we will let the stepper handle the navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const goTo = to => {
    dispatch({
      type: 'GO_TO',
      to,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalLayout labelledBy="modal" onClose={onClose}>
      <ModalHeader>
        <Typography fontWeight="bold" as="h2" id="title">
          {modalTitle}
        </Typography>
      </ModalHeader>
      <ModalBody>
        <Component />
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
