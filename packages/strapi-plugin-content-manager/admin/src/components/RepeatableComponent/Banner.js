import React, { forwardRef } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { Grab } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import pluginId from '../../pluginId';
import PreviewCarret from '../PreviewCarret';
import BannerWrapper from './BannerWrapper';
import CarretTop from './CarretTop';

/* eslint-disable jsx-a11y/no-static-element-interactions */

const Banner = forwardRef(
  (
    {
      displayedValue,
      doesPreviousFieldContainErrorsAndIsOpen,
      hasErrors,
      hasMinError,
      isFirst,
      isDragging,
      isOpen,
      onClickToggle,
      onClickRemove,
      style,
    },
    refs
  ) => {
    const display = isDragging ? 'none' : '';

    return (
      <BannerWrapper
        doesPreviousFieldContainErrorsAndIsOpen={
          doesPreviousFieldContainErrorsAndIsOpen
        }
        type="button"
        hasMinError={hasMinError}
        hasErrors={hasErrors}
        isFirst={isFirst}
        isOpen={isOpen}
        onClick={onClickToggle}
        ref={refs ? refs.dropRef : null}
        style={style}
      >
        {isDragging && <PreviewCarret isComponent />}
        <>
          <span className="img-wrapper" style={{ display }}>
            <CarretTop isOpen={isOpen} hasErrors={hasErrors} />
          </span>

          <FormattedMessage
            id={`${pluginId}.containers.Edit.pluginHeader.title.new`}
          >
            {msg => {
              return <span style={{ display }}>{displayedValue || msg}</span>;
            }}
          </FormattedMessage>
          <div className="cta-wrapper" style={{ display }}>
            <span
              className="trash-icon"
              style={{ marginRight: 10, padding: '0 5px' }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onClickRemove();
              }}
            >
              <FontAwesomeIcon icon="trash" />
            </span>
            <span className="grab" ref={refs ? refs.dragRef : null}>
              <Grab />
            </span>
          </div>
        </>
      </BannerWrapper>
    );
  }
);

Banner.defaultProps = {
  displayedValue: null,
  doesPreviousFieldContainErrorsAndIsOpen: false,
  hasErrors: false,
  hasMinError: false,
  isDragging: false,
  isFirst: false,
  isOpen: false,
  onClickRemove: () => {},
  onClickToggle: () => {},
  style: {},
};

Banner.propTypes = {
  displayedValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object,
  ]),
  doesPreviousFieldContainErrorsAndIsOpen: PropTypes.bool,
  hasErrors: PropTypes.bool,
  hasMinError: PropTypes.bool,
  isDragging: PropTypes.bool,
  isFirst: PropTypes.bool,
  isOpen: PropTypes.bool,
  onClickToggle: PropTypes.func,
  onClickRemove: PropTypes.func,
  style: PropTypes.object,
};

Banner.displayName = 'Banner';

export default Banner;
