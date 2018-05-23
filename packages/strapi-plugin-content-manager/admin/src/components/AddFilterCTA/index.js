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

function AddFilterCTA({ onClick, showHideText }) {
  const id = showHideText ? 'hide' : 'add';

  return (
    <Button type="button" onClick={onClick} marginTop>
      <img src={Logo} alt="filter_logo" />
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
