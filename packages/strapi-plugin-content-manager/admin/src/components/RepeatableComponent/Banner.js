import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { Grab } from '@buffetjs/icons';
import pluginId from '../../pluginId';
import BannerWrapper from './BannerWrapper';
import CarretTop from './CarretTop';

const Banner = ({ displayedValue, isOpen, onClickToggle, onClickRemove }) => {
  return (
    <BannerWrapper type="button" isOpen={isOpen} onClick={onClickToggle}>
      <span className="img-wrapper">
        <CarretTop />
      </span>

      <FormattedMessage
        id={`${pluginId}.containers.Edit.pluginHeader.title.new`}
      >
        {msg => {
          return <span>{displayedValue || msg}</span>;
        }}
      </FormattedMessage>
      <div className="cta-wrapper">
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
        <span className="grab">
          <Grab />
        </span>
      </div>
    </BannerWrapper>
  );
};

Banner.defaultProps = {
  displayedValue: null,
  isOpen: false,
  onClickRemove: () => {},
};

Banner.propTypes = {
  displayedValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object,
  ]),
  isOpen: PropTypes.bool,
  onClickToggle: PropTypes.func.isRequired,
  onClickRemove: PropTypes.func,
};

export default Banner;
