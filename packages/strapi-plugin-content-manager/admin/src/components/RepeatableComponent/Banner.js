import React, { forwardRef } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { Grab } from '@buffetjs/icons';
import pluginId from '../../pluginId';
import BannerWrapper from './BannerWrapper';
import PreviewCarret from '../PreviewCarret';
import CarretTop from './CarretTop';

const Banner = forwardRef(
  (
    {
      displayedValue,
      doesPreviousFieldContainErrorsAndIsOpen,
      hasErrors,
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
        hasErrors={hasErrors}
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
              style={{ marginRight: 13 }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onClickRemove();
              }}
            >
              <i className="fa fa-trash" />
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
  isDragging: false,
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
  isDragging: PropTypes.bool,
  isOpen: PropTypes.bool,
  onClickToggle: PropTypes.func,
  onClickRemove: PropTypes.func,
  style: PropTypes.object,
};

Banner.displayName = 'Banner';

export default Banner;
