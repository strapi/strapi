import React, { useReducer } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import {
  CarouselInput,
  CarouselSlide,
  CarouselActions,
  IconButton,
  Box,
} from '@strapi/design-system';
import Plus from '@strapi/icons/Plus';
import Refresh from '@strapi/icons/Refresh';
import reducer, { initialState } from './reducer';
import LogoModalStepper from '../LogoModalStepper';
import { SIZE, DIMENSION } from '../../utils/constants';
import stepper from './stepper';

const LogoInput = ({ customLogo, defaultLogo, onChangeLogo, onResetMenuLogo }) => {
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
        label={formatMessage({
          id: 'Settings.application.customization.carousel.title',
          defaultMessage: 'Logo',
        })}
        selectedSlide={0}
        hint={formatMessage(
          {
            id: 'Settings.application.customization.carousel-hint',
            defaultMessage:
              'Change the admin panel logo (Max dimension: {dimension}x{dimension}, Max file size: {size}KB)',
          },
          { size: SIZE, dimension: DIMENSION }
        )}
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
              onClick={() => goTo(customLogo ? 'pending' : 'upload')}
              label={formatMessage({
                id: 'Settings.application.customization.carousel.change-action',
                defaultMessage: 'Change logo',
              })}
              icon={<Plus />}
            />
            {customLogo && (
              <IconButton
                onClick={onResetMenuLogo}
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
  customLogo: null,
};

LogoInput.propTypes = {
  customLogo: PropTypes.shape({
    url: PropTypes.string,
    name: PropTypes.string,
  }),
  defaultLogo: PropTypes.string.isRequired,
  onChangeLogo: PropTypes.func.isRequired,
  onResetMenuLogo: PropTypes.func.isRequired,
};

export default LogoInput;
