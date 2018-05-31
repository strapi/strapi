/**
 *
 * AddFilterCTA
 *
 */ 

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

// Design
import Button from 'components/CustomButton';
import Logo from '../../assets/images/icon_filter.png';

const imgStyle = {
  marginTop: '-3px',
  marginRight: '10px',
  height: '7px',
  fontSize: '12px',
};

function AddFilterCTA({ onClick, showHideText }) {
  const id = showHideText ? 'hide' : 'add';

  return (
    <Button type="button" onClick={onClick} marginTop>
      <img src={Logo} alt="filter_logo" style={imgStyle} />
      <FormattedMessage id={`content-manager.components.AddFilterCTA.${id}`} />
    </Button>
  );
}

AddFilterCTA.defaultProps = {
  onClick: () => {},
  showHideText: false,
};

AddFilterCTA.propTypes = {
  onClick: PropTypes.func,
  showHideText: PropTypes.bool,
};

export default AddFilterCTA;
