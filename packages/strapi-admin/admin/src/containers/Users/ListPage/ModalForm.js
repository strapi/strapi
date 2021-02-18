import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@buffetjs/core';
import { Modal, ModalFooter, ModalHeader, useGlobalContext } from 'strapi-helper-plugin';
import stepper from './stepper';

const ModalForm = ({ isOpen, onClosed, onToggle }) => {
  const [currentStep, setStep] = useState('create');
  // Little trick to focus the first input
  // Without this the focus is lost
  const [showBody, setShowBody] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const { formatMessage } = useGlobalContext();
  const ref = useRef(null);
  const { buttonSubmitLabel, Component, isDisabled, next } = stepper[currentStep];

  const goNext = () => {
    if (next) {
      setStep(next);
    } else {
      onToggle();
    }
  };

  const handleClick = () => {
    if (ref.current) {
      ref.current.submit();
    } else {
      goNext();
    }
  };

  const handleClosed = () => {
    // Fetch data only if the user has submitted a new entry
    // We can use the registrationToken to know this
    if (registrationToken || currentStep === 'magic-link') {
      onClosed();
    }

    // Reset the state so we know that the user has created a new entry when there is a registrationToken
    setStep('create');
    setShowBody(false);
    setRegistrationToken(null);
  };

  const handleSubmit = (e, data) => {
    const { registrationToken } = data;

    setRegistrationToken(registrationToken);
    goNext();
  };

  const handleOpened = () => {
    setShowBody(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpened={handleOpened}
      onToggle={onToggle}
      onClosed={handleClosed}
      withoverflow="true"
    >
      <ModalHeader headerBreadcrumbs={['Settings.permissions.users.add-new']} />
      {showBody && (
        <Component
          isDisabled={isDisabled}
          onSubmit={handleSubmit}
          ref={currentStep === 'create' ? ref : null}
          registrationToken={registrationToken}
          setIsSubmiting={setIsSubmiting}
          showMagicLink={currentStep === 'magic-link'}
        />
      )}
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
          <Button color="success" type="button" onClick={handleClick} isLoading={isSubmiting}>
            {formatMessage({ id: buttonSubmitLabel })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ModalForm.defaultProps = {
  onClosed: () => {},
};

ModalForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClosed: PropTypes.func,
  onToggle: PropTypes.func.isRequired,
};

export default ModalForm;
