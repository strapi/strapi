import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';

import pluginId from '../../pluginId';

import Grab from '../../assets/images/grab_icon.svg';
import Logo from '../../assets/images/caret_top.svg';
import LogoGrey from '../../assets/images/caret_top_grey.svg';
import LogoError from '../../assets/images/caret_top_error.svg';
import GrabBlue from '../../assets/images/grab_icon_blue.svg';
import GrabError from '../../assets/images/grab_icon_error.svg';

import PreviewCarret from '../PreviewCarret';

import Flex from './Flex';
import ImgWrapper from './ImgWrapper';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/display-name
const ComponentBanner = forwardRef(
  (
    {
      doesPreviousFieldContainErrorsAndIsOpen,
      hasErrors,
      isFirst,
      isDragging,
      isOpen,
      mainField,
      modifiedData,
      name,
      onClick,
      removeField,
      style,
    },
    ref
  ) => {
    let logo = isOpen ? Logo : LogoGrey;
    let grab = isOpen ? GrabBlue : Grab;
    const opacity = isDragging ? 0.5 : 1;
    const displayedValue = get(
      modifiedData,
      [...name.split('.'), mainField],
      null
    );

    if (hasErrors) {
      grab = GrabError;
      logo = LogoError;
    }

    return (
      <div ref={ref}>
        {isDragging ? (
          <PreviewCarret isComponent />
        ) : (
          <Wrapper
            doesPreviousFieldContainErrorsAndIsOpen={
              doesPreviousFieldContainErrorsAndIsOpen
            }
            hasErrors={hasErrors}
            isFirst={isFirst}
            isOpen={isOpen}
            onClick={onClick}
            style={{ opacity, ...style }}
          >
            <Flex>
              <ImgWrapper hasErrors={hasErrors} isOpen={isOpen}>
                <img src={logo} alt="logo" />
              </ImgWrapper>
              <FormattedMessage
                id={`${pluginId}.containers.Edit.pluginHeader.title.new`}
              >
                {msg => {
                  return <span>{displayedValue || msg}</span>;
                }}
              </FormattedMessage>
            </Flex>
            <Flex className="button-wrapper">
              <button
                className="trash-icon"
                type="button"
                style={{ marginRight: 6 }}
                onClick={removeField}
              >
                <i className="fa fa-trash" />
              </button>
              <button type="button">
                <img
                  src={grab}
                  alt="grab icon"
                  style={{ verticalAlign: 'unset' }}
                />
              </button>
            </Flex>
          </Wrapper>
        )}
      </div>
    );
  }
);

ComponentBanner.defaultProps = {
  doesPreviousFieldContainErrorsAndIsOpen: false,
  hasErrors: false,
  isCreating: true,
  isDragging: false,
  isFirst: false,
  isOpen: false,
  mainField: 'id',
  onClick: () => {},
  removeField: () => {},
  style: {},
};

ComponentBanner.propTypes = {
  doesPreviousFieldContainErrorsAndIsOpen: PropTypes.bool,
  hasErrors: PropTypes.bool,
  isFirst: PropTypes.bool,
  isDragging: PropTypes.bool,
  isOpen: PropTypes.bool,
  mainField: PropTypes.string,
  modifiedData: PropTypes.object,
  name: PropTypes.string,
  onClick: PropTypes.func,
  removeField: PropTypes.func,
  style: PropTypes.object,
};

export default ComponentBanner;
