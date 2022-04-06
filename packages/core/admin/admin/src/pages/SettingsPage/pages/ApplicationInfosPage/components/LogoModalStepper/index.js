import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { ModalLayout, ModalHeader } from '@strapi/design-system/ModalLayout';
import { Typography } from '@strapi/design-system/Typography';
import reducer, { initialState } from './reducer';
import stepper from './stepper';

const LogoModalStepper = ({ initialStep, isOpen, onClose, onChangeLogo, customLogo }) => {
  const [{ currentStep, localImage }, dispatch] = useReducer(reducer, initialState);
  const { Component, modalTitle, next, prev } = stepper[currentStep];
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
      <Component
        setLocalImage={setLocalImage}
        goTo={goTo}
        next={next}
        prev={prev}
        onClose={onClose}
        asset={localImage || customLogo}
        onChangeLogo={onChangeLogo}
      />
    </ModalLayout>
  );
};

LogoModalStepper.defaultProps = {
  customLogo: undefined,
};

LogoModalStepper.propTypes = {
  customLogo: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    ext: PropTypes.string,
  }),
  initialStep: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onChangeLogo: PropTypes.func.isRequired,
};

export default LogoModalStepper;
