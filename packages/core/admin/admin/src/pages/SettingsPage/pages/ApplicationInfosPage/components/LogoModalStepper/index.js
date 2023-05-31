import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { ModalLayout, ModalHeader, Typography } from '@strapi/design-system';
import reducer, { initialState } from './reducer';

const LogoModalStepper = ({
  onChangeLogo,
  customLogo,
  goTo,
  Component,
  modalTitle,
  next,
  prev,
  currentStep,
}) => {
  const [{ localImage }, dispatch] = useReducer(reducer, initialState);
  const { formatMessage } = useIntl();

  const setLocalImage = (asset) => {
    dispatch({
      type: 'SET_LOCAL_IMAGE',
      value: asset,
    });
  };

  const handleCloseModal = () => {
    goTo(null);
  };

  if (!currentStep) {
    return null;
  }

  return (
    <ModalLayout labelledBy="modal" onClose={handleCloseModal}>
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
        onClose={handleCloseModal}
        asset={localImage || customLogo}
        onChangeLogo={onChangeLogo}
      />
    </ModalLayout>
  );
};

LogoModalStepper.defaultProps = {
  Component: undefined,
  currentStep: undefined,
  customLogo: undefined,
  modalTitle: undefined,
  next: null,
  prev: null,
};

LogoModalStepper.propTypes = {
  Component: PropTypes.elementType,
  currentStep: PropTypes.string,
  customLogo: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    ext: PropTypes.string,
  }),
  goTo: PropTypes.func.isRequired,
  modalTitle: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  next: PropTypes.string,
  onChangeLogo: PropTypes.func.isRequired,
  prev: PropTypes.string,
};

export default LogoModalStepper;
