import React, { useReducer } from 'react';

import {
  Box,
  CarouselActions,
  CarouselInput,
  CarouselSlide,
  IconButton,
} from '@strapi/design-system';
import { Plus, Refresh } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import LogoModalStepper from '../LogoModalStepper';

import reducer, { initialState } from './reducer';
import stepper from './stepper';

const LogoInput = ({
  canUpdate,
  customLogo,
  defaultLogo,
  hint,
  label,
  onChangeLogo,
  onResetLogo,
}) => {
  const [{ currentStep }, dispatch] = useReducer(reducer, initialState);
  const { Component, next, prev, modalTitle } = stepper[currentStep] || {};
  const { formatMessage } = useIntl();

  const goTo = (to) => {
    dispatch({
      type: 'GO_TO',
      to,
    });
  };

  return (
    <>
      <CarouselInput
        label={label}
        selectedSlide={0}
        hint={hint}
        // Carousel is used here for a single media,
        // we don't need previous and next labels but these props are required
        previousLabel=""
        nextLabel=""
        onNext={() => {}}
        onPrevious={() => {}}
        secondaryLabel={customLogo?.name || 'logo.png'}
        actions={
          <CarouselActions>
            <IconButton
              disabled={!canUpdate}
              onClick={() => goTo(customLogo ? 'pending' : 'upload')}
              label={formatMessage({
                id: 'Settings.application.customization.carousel.change-action',
                defaultMessage: 'Change logo',
              })}
              icon={<Plus />}
            />
            {customLogo && (
              <IconButton
                disabled={!canUpdate}
                onClick={onResetLogo}
                label={formatMessage({
                  id: 'Settings.application.customization.carousel.reset-action',
                  defaultMessage: 'Reset logo',
                })}
                icon={<Refresh />}
              />
            )}
          </CarouselActions>
        }
      >
        <CarouselSlide
          label={formatMessage({
            id: 'Settings.application.customization.carousel-slide.label',
            defaultMessage: 'Logo slide',
          })}
        >
          <Box
            maxHeight="40%"
            maxWidth="40%"
            as="img"
            src={customLogo?.url || defaultLogo}
            alt={formatMessage({
              id: 'Settings.application.customization.carousel.title',
              defaultMessage: 'Logo',
            })}
          />
        </CarouselSlide>
      </CarouselInput>
      <LogoModalStepper
        Component={Component}
        currentStep={currentStep}
        onChangeLogo={onChangeLogo}
        customLogo={customLogo}
        goTo={goTo}
        next={next}
        prev={prev}
        modalTitle={modalTitle}
      />
    </>
  );
};

LogoInput.defaultProps = {
  canUpdate: false,
  customLogo: null,
  hint: null,
};

LogoInput.propTypes = {
  canUpdate: PropTypes.bool,
  customLogo: PropTypes.shape({
    url: PropTypes.string,
    name: PropTypes.string,
  }),
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  defaultLogo: PropTypes.string.isRequired,
  onChangeLogo: PropTypes.func.isRequired,
  onResetLogo: PropTypes.func.isRequired,
};

export default LogoInput;
